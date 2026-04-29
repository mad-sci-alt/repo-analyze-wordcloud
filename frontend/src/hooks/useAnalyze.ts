import { useState, useCallback } from "react";
import { analyzeRepo, analyzeLocal, analyzeUpload, pollStatus, getResult } from "../api/client";
import type { AnalyzeState } from "../types";

type SourceMode = "remote" | "local" | "upload";

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ phase: "idle" });

  const submit = useCallback(async (
    mode: SourceMode,
    url: string,
    branch: string,
    local_path: string,
    top_n: number,
    custom_stopwords: string[],
    include_history: boolean,
    max_commits: number,
    file?: File,
  ) => {
    setState({ phase: "submitting" });
    try {
      let job_id: string;
      if (mode === "remote") {
        const res = await analyzeRepo(url, branch, top_n, custom_stopwords, include_history, max_commits);
        job_id = res.job_id;
      } else if (mode === "local") {
        const res = await analyzeLocal(local_path, top_n, custom_stopwords);
        job_id = res.job_id;
      } else {
        if (!file) throw new Error("No file selected");
        const res = await analyzeUpload(file, top_n, custom_stopwords);
        job_id = res.job_id;
      }
      setState({ phase: "polling", jobId: job_id });
      poll(job_id);
    } catch {
      setState({ phase: "error", message: "Failed to submit analysis request." });
    }
  }, []);

  const poll = useCallback(async (jobId: string) => {
    try {
      const status = await pollStatus(jobId);
      if (status.status === "done") {
        const result = await getResult(jobId);
        setState({ phase: "done", jobId, result });
      } else if (status.status === "error") {
        setState({ phase: "error", message: status.error ?? "Analysis failed." });
      } else {
        setState((s) => ({
          ...s,
          jobId,
          progress: status.progress ?? s.progress,
        }));
        setTimeout(() => poll(jobId), 1500);
      }
    } catch {
      setState({ phase: "error", message: "Failed to poll job status." });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  return { state, submit, reset };
}
