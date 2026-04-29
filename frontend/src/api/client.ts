import type { AnalyzeResponse, StatusResponse, ResultResponse } from "../types";

const BASE = "/api";

export const analyzeRepo = (
  url: string,
  branch: string,
  top_n: number,
  custom_stopwords: string[],
  include_history: boolean,
  max_commits: number,
) =>
  fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_url: url,
      branch,
      top_n,
      custom_stopwords,
      include_history,
      max_commits,
    }),
  }).then((r) => r.json() as Promise<AnalyzeResponse>);

export const pollStatus = (jobId: string) =>
  fetch(`${BASE}/status/${jobId}`).then((r) => r.json() as Promise<StatusResponse>);

export const getResult = (jobId: string) =>
  fetch(`${BASE}/result/${jobId}`).then((r) => r.json() as Promise<ResultResponse>);

export const downloadCSV = (jobId: string) => {
  const a = document.createElement("a");
  a.href = `${BASE}/result/${jobId}/export`;
  a.download = `wordcloud-${jobId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
