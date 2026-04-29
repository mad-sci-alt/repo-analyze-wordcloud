export interface AnalyzeResponse {
  job_id: string;
  status: string;
  message?: string;
}

export interface ProgressInfo {
  stage: "cloning" | "tokenizing" | "generating" | "analyzing_history";
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

export interface DirectoryStat {
  dir: string;
  token_count: number;
  file_count: number;
  top_words: FrequencyStat[];
}

export interface FileStat {
  path: string;
  token_count: number;
  extension: string;
}

export interface CommitSnapshot {
  date: string;
  total_lines: number;
  files_changed: number;
  languages: Record<string, number>;
}

export interface ResultResponse {
  job_id: string;
  status: string;
  word_cloud_image: string;
  frequency_stats: FrequencyStat[];
  metadata: Metadata;
  directory_stats: DirectoryStat[];
  file_stats: FileStat[];
  language_stats: Record<string, FrequencyStat[]>;
  commit_history: CommitSnapshot[];
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

export type TopNOption = 10 | 20 | 25 | 50 | 100;
