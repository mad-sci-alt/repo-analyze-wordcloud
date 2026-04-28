import { RepoInputForm } from "./components/RepoInputForm";
import { StatusIndicator } from "./components/StatusIndicator";
import { WordCloudDisplay } from "./components/WordCloudDisplay";
import { FrequencyChart } from "./components/FrequencyChart";
import { useAnalyze } from "./hooks/useAnalyze";

function App() {
  const { state, submit, reset } = useAnalyze();

  const isLoading = state.phase === "submitting" || state.phase === "polling";
  const isDone = state.phase === "done";
  const isError = state.phase === "error";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GC</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            GitHub Word Cloud
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Input Section */}
        <section className="flex flex-col items-center mb-10">
          <p className="text-gray-500 text-sm mb-6 text-center max-w-md">
            Paste a public GitHub repository URL to generate a word cloud from its code.
          </p>
          <RepoInputForm onSubmit={submit} loading={isLoading} />
        </section>

        {/* Loading State */}
        {isLoading && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <StatusIndicator progress={state.progress} />
          </section>
        )}

        {/* Error State */}
        {isError && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <p className="text-red-700 font-medium mb-2">Analysis Failed</p>
            <p className="text-red-600 text-sm mb-4">{state.message}</p>
            <button
              onClick={reset}
              className="text-sm text-red-700 underline cursor-pointer"
            >
              Try again
            </button>
          </section>
        )}

        {/* Result */}
        {isDone && state.result && (
          <>
            {/* Metadata */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Repository</span>
                  <p className="text-sm font-medium text-gray-900">{state.result.metadata.repo_url}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Branch</span>
                  <p className="text-sm font-medium text-gray-900">{state.result.metadata.branch}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Files Processed</span>
                  <p className="text-sm font-medium text-gray-900">{state.result.metadata.files_processed}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Total Tokens</span>
                  <p className="text-sm font-medium text-gray-900">{state.result.metadata.total_tokens.toLocaleString()}</p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={reset}
                    className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Analyze another repo
                  </button>
                </div>
              </div>
            </section>

            {/* Word Cloud */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Word Cloud</h2>
              <p className="text-gray-500 text-xs mb-4">Top 20 most frequent non-stopword tokens</p>
              <WordCloudDisplay imageDataUrl={state.result.word_cloud_image} />
            </section>

            {/* Frequency Chart */}
            <section className="mb-6">
              <FrequencyChart stats={state.result.frequency_stats} />
            </section>

            {/* Stats Table */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 px-6 pt-6 pb-2">
                Word Statistics
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-gray-500 font-medium">Rank</th>
                      <th className="text-left px-6 py-3 text-gray-500 font-medium">Word</th>
                      <th className="text-right px-6 py-3 text-gray-500 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.result.frequency_stats.map((stat) => (
                      <tr key={stat.rank} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-400">#{stat.rank}</td>
                        <td className="px-6 py-3 font-medium text-gray-800">{stat.word}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{stat.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
