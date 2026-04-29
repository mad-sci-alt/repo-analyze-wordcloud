import csv
import io
import shutil
from collections import Counter
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    AnalyzeByUploadRequest,
    ResultResponse,
    StatusResponse,
    FrequencyStat,
    Metadata,
    ProgressInfo,
    DirectoryStat,
    FileStat,
)
from ..services.git_service import (
    clone_repository,
    extract_code_files,
    analyze_local_directory,
)
from ..services.tokenizer import tokenize_file
from ..services.stopwords import filter_stopwords
from ..services.wordcloud_service import generate_wordcloud
from ..config import get_temp_dir, EXT_TO_LANG

router = APIRouter(prefix="/api", tags=["analyze"])

# In-memory job store
jobs: dict[str, dict] = {}


def _collect_stats(
    root: Path,
    extra_stop: set[str],
):
    """
    Walk root directory, collect all statistics.
    Returns (total_counter, dir_counters, file_token_counts, lang_counters, files_processed).
    """
    total_counter: Counter = Counter()
    dir_counters: dict[str, Counter] = {}
    file_token_counts: dict[str, int] = {}
    lang_counters: dict[str, Counter] = {}
    files_processed = 0

    for path, content in extract_code_files(root):
        tokens = tokenize_file(content)
        total_counter.update(tokens)
        files_processed += 1

        parts = path.parts
        top_dir = parts[0] if parts else str(path)
        if top_dir not in dir_counters:
            dir_counters[top_dir] = Counter()
        dir_counters[top_dir].update(tokens)

        ext = path.suffix.lower()
        lang = EXT_TO_LANG.get(ext, ext.lstrip(".") or "other")
        if lang not in lang_counters:
            lang_counters[lang] = Counter()
        lang_counters[lang].update(tokens)

        file_token_counts[str(path)] = sum(tokens.values())

    return total_counter, dir_counters, file_token_counts, lang_counters, files_processed


def _build_result(
    total_counter: Counter,
    dir_counters: dict[str, Counter],
    file_token_counts: dict[str, int],
    lang_counters: dict[str, Counter],
    files_processed: int,
    extra_stop: set[str],
    top_n: int,
    source_type: str,
    source: str,
    branch: str | None,
    repo,
    include_history: bool,
    max_commits: int,
):
    """Build and return the final result dict plus the word cloud image."""
    filtered = filter_stopwords(total_counter, extra=extra_stop)

    if not filtered:
        raise ValueError("No significant words found in repository.")

    top_words = filtered.most_common(top_n)
    image_b64 = generate_wordcloud(filtered, top_n=top_n)

    # Directory stats
    directory_stats = []
    for d, counter in sorted(dir_counters.items(), key=lambda x: sum(x[1].values()), reverse=True):
        filtered_dir = filter_stopwords(counter, extra=extra_stop)
        top_for_dir = filtered_dir.most_common(5)
        directory_stats.append(DirectoryStat(
            dir=d,
            token_count=sum(counter.values()),
            file_count=sum(1 for p in file_token_counts if p.split("/")[0] == d),
            top_words=[FrequencyStat(word=w, count=c, rank=i + 1) for i, (w, c) in enumerate(top_for_dir)],
        ))

    # File stats
    file_stats = [
        FileStat(
            path=p,
            token_count=c,
            extension=p.rsplit(".", 1)[-1] if "." in p else "",
        )
        for p, c in sorted(file_token_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    ]

    # Language stats
    language_stats: dict[str, list] = {}
    for lang, counter in sorted(lang_counters.items(), key=lambda x: sum(x[1].values()), reverse=True):
        filtered_lang = filter_stopwords(counter, extra=extra_stop)
        top_for_lang = filtered_lang.most_common(10)
        language_stats[lang] = [
            FrequencyStat(word=w, count=c, rank=i + 1)
            for i, (w, c) in enumerate(top_for_lang)
        ]

    # Commit history (remote only)
    commit_history: list[dict] = []
    if include_history and repo is not None:
        commit_history = _build_commit_history(repo, max_commits)

    return {
        "word_cloud_image": image_b64,
        "frequency_stats": [
            {"word": w, "count": c, "rank": i + 1}
            for i, (w, c) in enumerate(top_words)
        ],
        "all_frequency_stats": [
            {"word": w, "count": c, "rank": i + 1}
            for i, (w, c) in enumerate(filtered.most_common())
        ],
        "metadata": {
            "source_type": source_type,
            "source": source,
            "branch": branch,
            "files_processed": files_processed,
            "total_tokens": sum(filtered.values()),
        },
        "directory_stats": [d.model_dump() for d in directory_stats],
        "file_stats": [f.model_dump() for f in file_stats],
        "language_stats": {lang: [s.model_dump() for s in stats] for lang, stats in language_stats.items()},
        "commit_history": commit_history,
    }


def _build_commit_history(repo, max_commits: int) -> list[dict]:
    """Build commit history from a GitPython Repo object."""
    by_date: dict[str, dict] = {}
    for commit in repo.iter_commits(max_count=max_commits):
        date_str = datetime.fromtimestamp(commit.committed_date).strftime("%Y-%m-%d")
        if date_str not in by_date:
            by_date[date_str] = {"date": date_str, "total_lines": 0, "files_changed": 0, "languages": {}}
        by_date[date_str]["total_lines"] += sum(
            commit.stats.files[f]["insertions"] + commit.stats.files[f]["deletions"]
            for f in commit.stats.files
        )
        by_date[date_str]["files_changed"] += len(commit.stats.files)
        for file_path in commit.stats.files:
            ext = Path(file_path).suffix.lower()
            lang = EXT_TO_LANG.get(ext, ext.lstrip(".") or "other")
            lines = commit.stats.files[file_path]["insertions"] + commit.stats.files[file_path]["deletions"]
            by_date[date_str]["languages"][lang] = by_date[date_str]["languages"].get(lang, 0) + lines

    return sorted(by_date.values(), key=lambda x: x["date"])


def run_analysis_remote(
    job_id: str,
    url: str,
    branch: str,
    top_n: int,
    custom_stopwords: list[str],
    include_history: bool,
    max_commits: int,
):
    """Background task for remote repository analysis."""
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = {"stage": "scanning", "message": "Cloning repository..."}

    temp_dir = get_temp_dir() / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        repo_root, repo = clone_repository(url, branch, temp_dir, depth=None if include_history else 1)
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        return

    extra_stop = set(w.lower().strip() for w in custom_stopwords if w.strip())

    jobs[job_id]["progress"] = {"stage": "tokenizing", "message": "Analyzing code..."}
    total_counter, dir_counters, file_token_counts, lang_counters, files_processed = _collect_stats(
        repo_root, extra_stop
    )

    jobs[job_id]["progress"] = {"stage": "generating", "message": "Rendering word cloud..."}
    try:
        result = _build_result(
            total_counter, dir_counters, file_token_counts, lang_counters,
            files_processed, extra_stop, top_n,
            "remote", url, branch,
            repo, include_history, max_commits,
        )
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        shutil.rmtree(temp_dir, ignore_errors=True)
        return

    jobs[job_id].update(status="done", result=result)
    shutil.rmtree(temp_dir, ignore_errors=True)


def run_analysis_local(
    job_id: str,
    local_path: str,
    top_n: int,
    custom_stopwords: list[str],
):
    """Background task for local directory analysis."""
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = {"stage": "scanning", "message": "Scanning local directory..."}

    try:
        root, _ = analyze_local_directory(local_path)
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        return

    extra_stop = set(w.lower().strip() for w in custom_stopwords if w.strip())

    jobs[job_id]["progress"] = {"stage": "tokenizing", "message": "Analyzing code..."}
    total_counter, dir_counters, file_token_counts, lang_counters, files_processed = _collect_stats(
        root, extra_stop
    )

    jobs[job_id]["progress"] = {"stage": "generating", "message": "Rendering word cloud..."}
    try:
        result = _build_result(
            total_counter, dir_counters, file_token_counts, lang_counters,
            files_processed, extra_stop, top_n,
            "local", str(root), None,
            None, False, 0,
        )
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        return

    jobs[job_id].update(status="done", result=result)


def run_analysis_upload(
    job_id: str,
    top_n: int,
    custom_stopwords: list[str],
):
    """Background task: extract uploaded zip to temp dir, then analyze."""
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = {"stage": "scanning", "message": "Extracting uploaded archive..."}

    temp_dir = get_temp_dir() / job_id
    extract_dir = temp_dir / "extracted"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        zip_path = temp_dir / "upload.zip"
        # Write the zip bytes saved by the endpoint
        with open(zip_path, "rb") as f:
            zip_bytes = f.read()

        import zipfile, io
        with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
            zf.extractall(extract_dir)

        # Find the actual root — unzipping may produce a single root folder
        candidates = list(extract_dir.iterdir())
        if len(candidates) == 1 and candidates[0].is_dir():
            root = candidates[0]
        else:
            root = extract_dir

    except Exception as e:
        jobs[job_id].update(status="error", error=f"Failed to extract archive: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return

    extra_stop = set(w.lower().strip() for w in custom_stopwords if w.strip())

    jobs[job_id]["progress"] = {"stage": "tokenizing", "message": "Analyzing code..."}
    total_counter, dir_counters, file_token_counts, lang_counters, files_processed = _collect_stats(
        root, extra_stop
    )

    jobs[job_id]["progress"] = {"stage": "generating", "message": "Rendering word cloud..."}
    try:
        result = _build_result(
            total_counter, dir_counters, file_token_counts, lang_counters,
            files_processed, extra_stop, top_n,
            "upload", "uploaded archive", None,
            None, False, 0,
        )
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        shutil.rmtree(temp_dir, ignore_errors=True)
        return

    jobs[job_id].update(status="done", result=result)
    shutil.rmtree(temp_dir, ignore_errors=True)


# ── API Endpoints ────────────────────────────────────────────────────────────────


@router.post("/analyze", response_model=AnalyzeResponse, status_code=202)
def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Analyze a remote GitHub repository."""
    job_id = str(uuid4())
    jobs[job_id] = {"status": "pending", "progress": None, "result": None, "error": None}
    background_tasks.add_task(
        run_analysis_remote,
        job_id,
        req.repo_url,
        req.branch,
        req.top_n,
        req.custom_stopwords,
        req.include_history,
        req.max_commits,
    )
    return AnalyzeResponse(job_id=job_id, status="pending", message="Repository queued for analysis")


@router.post("/analyze/local", response_model=AnalyzeResponse, status_code=202)
def analyze_local(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Analyze a local directory path."""
    if not req.local_path:
        raise HTTPException(422, "local_path is required for this endpoint")

    job_id = str(uuid4())
    jobs[job_id] = {"status": "pending", "progress": None, "result": None, "error": None}
    background_tasks.add_task(
        run_analysis_local,
        job_id,
        req.local_path,
        req.top_n,
        req.custom_stopwords,
    )
    return AnalyzeResponse(job_id=job_id, status="pending", message="Local directory queued for analysis")


@router.post("/analyze/upload", response_model=AnalyzeResponse, status_code=202)
def analyze_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    top_n: int = 20,
    custom_stopwords: str = "",
):
    """Upload a zip or tar.gz archive to analyze. The file is saved to disk so the background task can read it."""
    if not file.filename:
        raise HTTPException(422, "No file provided")

    job_id = str(uuid4())
    jobs[job_id] = {"status": "pending", "progress": None, "result": None, "error": None}

    # Save uploaded bytes synchronously so background task can read from disk
    temp_dir = get_temp_dir() / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    zip_path = temp_dir / "upload.zip"

    with open(zip_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    stopwords = [w.strip() for w in custom_stopwords.split(",") if w.strip()] if custom_stopwords else []
    background_tasks.add_task(run_analysis_upload, job_id, top_n, stopwords)

    return AnalyzeResponse(
        job_id=job_id,
        status="pending",
        message="Archive queued for analysis",
        upload_type="upload",
    )


@router.get("/status/{job_id}", response_model=StatusResponse)
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    resp = StatusResponse(job_id=job_id, status=job["status"])
    if job.get("progress"):
        resp.progress = ProgressInfo(**job["progress"])
    if job.get("error"):
        resp.error = job["error"]
    return resp


@router.get("/result/{job_id}", response_model=ResultResponse)
def get_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    if job["status"] in ("processing", "pending"):
        raise HTTPException(409, "Analysis not yet complete")
    if job["status"] == "error":
        raise HTTPException(500, job.get("error", "Unknown error"))

    result = job["result"]
    return ResultResponse(
        job_id=job_id,
        status="done",
        word_cloud_image=result["word_cloud_image"],
        frequency_stats=[FrequencyStat(**s) for s in result["frequency_stats"]],
        metadata=Metadata(**result["metadata"]),
        directory_stats=[DirectoryStat(**d) for d in result.get("directory_stats", [])],
        file_stats=[FileStat(**f) for f in result.get("file_stats", [])],
        language_stats={
            lang: [FrequencyStat(**s) for s in stats]
            for lang, stats in result.get("language_stats", {}).items()
        },
        commit_history=result.get("commit_history", []),
    )


@router.get("/result/{job_id}/export")
def export_csv(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    if job["status"] != "done":
        raise HTTPException(409, "Analysis not yet complete")

    all_stats = job["result"].get("all_frequency_stats", job["result"]["frequency_stats"])
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["rank", "word", "count"])
    writer.writeheader()
    writer.writerows(all_stats)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="wordcloud-{job_id}.csv"'},
    )
