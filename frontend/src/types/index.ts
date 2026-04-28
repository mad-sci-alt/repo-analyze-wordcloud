export interface AnalyzeResponse {
  job_id: string;
  status: string;
  message?: string;
}

export interface ProgressInfo {
  stage: "cloning" | "tokenizing" | "generating";
  message: string;
}

export interface StatusResponse {
  job_id: string;
  status: "pending" | "processing" | "done" | "error";
  progress?: ProgressInfo;
  error?: string;
}

export interface FrequencyStat {
  word: string;
  count: number;
  rank: number;
}

export interface Metadata {
  repo_url: string;
  branch: string;
  files_processed: number;
  total_tokens: number;
}

export interface ResultResponse {
  job_id: string;
  status: string;
  word_cloud_image: string;
  frequency_stats: FrequencyStat[];
  metadata: Metadata;
}

export type AnalyzePhase =
  | "idle"
  | "submitting"
  | "polling"
  | "done"
  | "error";

export interface AnalyzeState {
  phase: AnalyzePhase;
  jobId?: string;
  progress?: ProgressInfo;
  result?: ResultResponse;
  message?: string;
}
