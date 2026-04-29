import csv
import io
import shutil
from collections import Counter
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    ResultResponse,
    StatusResponse,
    FrequencyStat,
    Metadata,
    ProgressInfo,
    DirectoryStat,
    FileStat,
)
from ..services.git_service import clone_repository, extract_code_files
from ..services.tokenizer import tokenize_file
from ..services.stopwords import filter_stopwords
from ..services.wordcloud_service import generate_wordcloud
from ..config import get_temp_dir, EXT_TO_LANG

router = APIRouter(prefix="/api", tags=["analyze"])

# In-memory job store
jobs: dict[str, dict] = {}


def run_analysis(
    job_id: str,
    url: str,
    branch: str,
    top_n: int,
    custom_stopwords: list[str],
    include_history: bool,
    max_commits: int,
):
    """Background task: clone, tokenize, generate word cloud."""
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = {"stage": "cloning", "message": "Cloning repository..."}

    temp_dir = get_temp_dir() / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Shallow clone for fast analysis; full clone only if commit history is needed
    try:
        depth = None if include_history else 1
        repo_root, repo = clone_repository(url, branch, temp_dir, depth=depth)
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        return

    # Collect all stats in one pass
    jobs[job_id]["progress"] = {"stage": "tokenizing", "message": "Analyzing code..."}
    total_counter: Counter = Counter()
    dir_counters: dict[str, Counter] = {}
    file_token_counts: dict[str, int] = {}
    lang_counters: dict[str, Counter] = {}
    files_processed = 0

    for path, content in extract_code_files(repo_root):
        tokens = tokenize_file(content)
        total_counter.update(tokens)
        files_processed += 1

        # Directory stats — use path.parts which now works on relative Path objects
        parts = path.parts
        top_dir = parts[0] if parts else str(path)
        if top_dir not in dir_counters:
            dir_counters[top_dir] = Counter()
        dir_counters[top_dir].update(tokens)

        # Language stats
        ext = path.suffix.lower()
        lang = EXT_TO_LANG.get(ext, ext.lstrip(".") or "other")
        if lang not in lang_counters:
            lang_counters[lang] = Counter()
        lang_counters[lang].update(tokens)

        # File stats (path is now a relative Path object)
        file_token_counts[str(path)] = sum(tokens.values())

    # Filter stopwords
    extra_stop = set(w.lower().strip() for w in custom_stopwords if w.strip())
    filtered = filter_stopwords(total_counter, extra=extra_stop)

    if not filtered:
        jobs[job_id].update(
            status="error",
            error="No significant words found in repository."
        )
        shutil.rmtree(temp_dir, ignore_errors=True)
        return

    jobs[job_id]["progress"] = {"stage": "generating", "message": "Rendering word cloud..."}

    top_words = filtered.most_common(top_n)
    image_b64 = generate_wordcloud(filtered, top_n=top_n)

    # Build directory stats
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

    # Build file stats (top 20 by token count)
    file_stats = [
        FileStat(
            path=p,
            token_count=c,
            extension=p.rsplit(".", 1)[-1] if "." in p else "",
        )
        for p, c in sorted(file_token_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    ]

    # Build language stats (top 10 words per language)
    language_stats: dict[str, list] = {}
    for lang, counter in sorted(lang_counters.items(), key=lambda x: sum(x[1].values()), reverse=True):
        filtered_lang = filter_stopwords(counter, extra=extra_stop)
        top_for_lang = filtered_lang.most_common(10)
        language_stats[lang] = [
            FrequencyStat(word=w, count=c, rank=i + 1)
            for i, (w, c) in enumerate(top_for_lang)
        ]

    # Build commit history
    commit_history: list[dict] = []
    if include_history:
        jobs[job_id]["progress"] = {
            "stage": "analyzing_history",
            "message": f"Analyzing commit history (up to {max_commits} commits)...",
        }
        commit_count = 0
        for commit in repo.iter_commits(max_count=max_commits):
            date_str = datetime.fromtimestamp(commit.committed_date).strftime("%Y-%m-%d")
            files_changed = len(commit.stats.files)
            lang_delta: dict[str, int] = {}
            total_delta = 0

            # Track token count per language for this commit
            for file_path in commit.stats.files:
                ext = Path(file_path).suffix.lower()
                lang = EXT_TO_LANG.get(ext, ext.lstrip(".") or "other")
                lines = commit.stats.files[file_path]["insertions"] + commit.stats.files[file_path]["deletions"]
                lang_delta[lang] = lang_delta.get(lang, 0) + lines
                total_delta += lines

            commit_history.append({
                "date": date_str,
                "message": commit.message.strip().split("\n")[0][:80],
                "total_lines": total_delta,
                "files_changed": files_changed,
                "languages": lang_delta,
            })
            commit_count += 1

        # Group by date (aggregate multiple commits on the same day)
        by_date: dict[str, dict] = {}
        for c in commit_history:
            d = c["date"]
            if d not in by_date:
                by_date[d] = {"date": d, "total_lines": 0, "files_changed": 0, "languages": {}}
            by_date[d]["total_lines"] += c["total_lines"]
            by_date[d]["files_changed"] += c["files_changed"]
            for lang, lines in c["languages"].items():
                by_date[d]["languages"][lang] = by_date[d]["languages"].get(lang, 0) + lines

        commit_history = sorted(by_date.values(), key=lambda x: x["date"])

    jobs[job_id].update(
        status="done",
        result={
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
                "repo_url": url,
                "branch": branch,
                "files_processed": files_processed,
                "total_tokens": sum(filtered.values()),
            },
            "directory_stats": [d.model_dump() for d in directory_stats],
            "file_stats": [f.model_dump() for f in file_stats],
            "language_stats": {lang: [s.model_dump() for s in stats] for lang, stats in language_stats.items()},
            "commit_history": commit_history,
        },
    )

    shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/analyze", response_model=AnalyzeResponse, status_code=202)
def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid4())
    jobs[job_id] = {
        "status": "pending",
        "progress": None,
        "result": None,
        "error": None,
    }
    background_tasks.add_task(
        run_analysis,
        job_id,
        req.repo_url,
        req.branch,
        req.top_n,
        req.custom_stopwords,
        req.include_history,
        req.max_commits,
    )
    return AnalyzeResponse(
        job_id=job_id,
        status="pending",
        message="Repository queued for analysis",
    )


@router.get("/status/{job_id}", response_model=StatusResponse)
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    resp = StatusResponse(
        job_id=job_id,
        status=job["status"],
    )
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
    if job["status"] == "processing" or job["status"] == "pending":
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
    """Export all filtered word frequencies as a CSV download."""
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
