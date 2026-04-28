import shutil
from collections import Counter
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    ResultResponse,
    StatusResponse,
    FrequencyStat,
    Metadata,
    ProgressInfo,
)
from ..services.git_service import clone_repository, extract_code_files
from ..services.tokenizer import tokenize_file
from ..services.stopwords import filter_stopwords
from ..services.wordcloud_service import generate_wordcloud
from ..config import get_temp_dir

router = APIRouter(prefix="/api", tags=["analyze"])

# In-memory job store
jobs: dict[str, dict] = {}


def run_analysis(job_id: str, url: str, branch: str):
    """Background task: clone, tokenize, generate word cloud."""
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = {"stage": "cloning", "message": "Cloning repository..."}

    temp_dir = get_temp_dir() / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        repo_root = clone_repository(url, branch, temp_dir)
    except ValueError as e:
        jobs[job_id].update(status="error", error=str(e))
        return

    # Tokenize all code files
    jobs[job_id]["progress"] = {"stage": "tokenizing", "message": "Analyzing code..."}
    total_counter: Counter = Counter()
    files_processed = 0

    for _, content in extract_code_files(repo_root):
        total_counter.update(tokenize_file(content))
        files_processed += 1

    # Filter stopwords
    filtered = filter_stopwords(total_counter)

    if not filtered:
        jobs[job_id].update(
            status="error",
            error="No significant words found in repository. The repo may contain only binary files or stopword-only code."
        )
        shutil.rmtree(temp_dir, ignore_errors=True)
        return

    jobs[job_id]["progress"] = {"stage": "generating", "message": "Rendering word cloud..."}

    top20 = filtered.most_common(20)
    image_b64 = generate_wordcloud(filtered, top_n=20)

    jobs[job_id].update(
        status="done",
        result={
            "word_cloud_image": image_b64,
            "frequency_stats": [
                {"word": w, "count": c, "rank": i + 1}
                for i, (w, c) in enumerate(top20)
            ],
            "metadata": {
                "repo_url": url,
                "branch": branch,
                "files_processed": files_processed,
                "total_tokens": sum(filtered.values()),
            },
        },
    )

    # Cleanup temp dir
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
    background_tasks.add_task(run_analysis, job_id, req.repo_url, req.branch)
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
    return ResultResponse(
        job_id=job_id,
        status="done",
        word_cloud_image=job["result"]["word_cloud_image"],
        frequency_stats=[FrequencyStat(**s) for s in job["result"]["frequency_stats"]],
        metadata=Metadata(**job["result"]["metadata"]),
    )
