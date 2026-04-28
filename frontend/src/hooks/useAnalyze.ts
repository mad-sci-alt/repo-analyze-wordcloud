import { useState, useCallback } from "react";
import { analyzeRepo, pollStatus, getResult } from "../api/client";
import type { AnalyzeState } from "../types";

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ phase: "idle" });

  const submit = useCallback(async (url: string, branch: string) => {
    setState({ phase: "submitting" });
    try {
      const { job_id } = await analyzeRepo(url, branch);
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
