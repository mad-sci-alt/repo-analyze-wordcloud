import type { AnalyzeResponse, StatusResponse, ResultResponse } from "../types";

const BASE = "/api";

export const analyzeRepo = (url: string, branch: string) =>
  fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: url, branch }),
  }).then((r) => r.json() as Promise<AnalyzeResponse>);

export const pollStatus = (jobId: string) =>
  fetch(`${BASE}/status/${jobId}`).then((r) => r.json() as Promise<StatusResponse>);

export const getResult = (jobId: string) =>
  fetch(`${BASE}/result/${jobId}`).then((r) => r.json() as Promise<ResultResponse>);
