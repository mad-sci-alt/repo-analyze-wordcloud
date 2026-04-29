from pydantic import BaseModel, Field
from typing import Optional


class AnalyzeRequest(BaseModel):
    repo_url: str | None = Field(default=None, description="GitHub repository URL")
    branch: str = Field(default="main", description="Branch to analyze (used when repo_url is provided)")
    local_path: str | None = Field(default=None, description="Absolute local path to a code directory")
    top_n: int = Field(default=20, ge=5, le=200, description="Number of words to show in the word cloud")
    custom_stopwords: list[str] = Field(default_factory=list, description="Additional stopwords to filter out")
    include_history: bool = Field(default=False, description="Analyze commit history for language trends over time")
    max_commits: int = Field(default=50, ge=10, le=500, description="Max number of commits to analyze when include_history is true")


class AnalyzeByUploadRequest(BaseModel):
    top_n: int = Field(default=20, ge=5, le=200)
    custom_stopwords: list[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    message: str = ""
    upload_type: str = "url"  # "url" | "upload" — helps frontend distinguish the endpoint


class ProgressInfo(BaseModel):
    stage: str  # "scanning" | "tokenizing" | "generating" | "analyzing_history"
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


class DirectoryStat(BaseModel):
    dir: str
    token_count: int
    file_count: int
    top_words: list[FrequencyStat]


class FileStat(BaseModel):
    path: str
    token_count: int
    extension: str


class Metadata(BaseModel):
    source_type: str  # "remote" | "local"
    source: str  # repo URL or local path
    branch: str | None = None
    files_processed: int
    total_tokens: int


class ResultResponse(BaseModel):
    job_id: str
    status: str
    word_cloud_image: str  # base64 data URL
    frequency_stats: list[FrequencyStat]
    metadata: Metadata
    directory_stats: list[DirectoryStat] = Field(default_factory=list)
    file_stats: list[FileStat] = Field(default_factory=list)
    language_stats: dict[str, list[FrequencyStat]] = Field(default_factory=dict)
    commit_history: list[dict] = Field(default_factory=list)
