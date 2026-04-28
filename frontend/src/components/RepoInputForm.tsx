import { useState } from "react";

interface Props {
  onSubmit: (url: string, branch: string) => void;
  loading: boolean;
}

export function RepoInputForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), branch.trim() || "main");
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
      <div className="mb-4">
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
