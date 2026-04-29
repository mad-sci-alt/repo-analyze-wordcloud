import { useState } from "react";
import type { TopNOption } from "../types";

interface Props {
  onSubmit: (url: string, branch: string, top_n: number, custom_stopwords: string[], include_history: boolean, max_commits: number) => void;
  loading: boolean;
}

const TOP_N_OPTIONS: TopNOption[] = [10, 20, 25, 50, 100];

export function RepoInputForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [topN, setTopN] = useState<TopNOption>(20);
  const [customStopwords, setCustomStopwords] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [maxCommits, setMaxCommits] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const words = customStopwords
      .split(/[,\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    onSubmit(url.trim(), branch.trim() || "main", topN, words, includeHistory, maxCommits);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="repo-url">
          GitHub Repository URL
        </label>
        <input
          id="repo-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          required
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="branch">
            Branch
          </label>
          <input
            id="branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Words in Cloud
          </label>
          <div className="flex gap-1">
            {TOP_N_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTopN(n)}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                  topN === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1 cursor-pointer"
      >
        {showAdvanced ? "▾" : "▸"} Advanced Options
      </button>

      {showAdvanced && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="custom-stopwords">
            Custom Stopwords
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Enter words to exclude, separated by commas or newlines. Example: myCompany, internalAPI
          </p>
          <textarea
            id="custom-stopwords"
            value={customStopwords}
            onChange={(e) => setCustomStopwords(e.target.value)}
            disabled={loading}
            rows={3}
            placeholder="myCompany, internalAPI"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 resize-none"
          />

          <div className="mt-4 flex items-center gap-2">
            <input
              id="include-history"
              type="checkbox"
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <label htmlFor="include-history" className="text-sm font-medium text-gray-700 cursor-pointer">
              Include Commit History
            </label>
          </div>

          {includeHistory && (
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1" htmlFor="max-commits">
                Max commits to analyze
              </label>
              <input
                id="max-commits"
                type="number"
                min={10}
                max={500}
                value={maxCommits}
                onChange={(e) => setMaxCommits(Math.min(500, Math.max(10, Number(e.target.value))))}
                disabled={loading}
                className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
              />
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition duration-200 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Analyze Repository"}
      </button>
    </form>
  );
}
