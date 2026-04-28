from pydantic import BaseModel, Field
from typing import Optional


class AnalyzeRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL")
    branch: str = Field(default="main", description="Branch to analyze")


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    message: str = ""


class ProgressInfo(BaseModel):
    stage: str  # "cloning" | "tokenizing" | "generating"
    message: str


class StatusResponse(BaseModel):
    job_id: str
    status: str  # "pending" | "processing" | "done" | "error"
    progress: Optional[ProgressInfo] = None
    error: Optional[str] = None


class FrequencyStat(BaseModel):
    word: str
    count: int
    rank: int


class Metadata(BaseModel):
    repo_url: str
    branch: str
    files_processed: int
    total_tokens: int


class ResultResponse(BaseModel):
    job_id: str
    status: str
    word_cloud_image: str  # base64 data URL
    frequency_stats: list[FrequencyStat]
    metadata: Metadata
