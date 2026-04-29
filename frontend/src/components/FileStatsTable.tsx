import type { FileStat } from "../types";

const EXT_COLORS: Record<string, string> = {
  py:   "#3572A5",
  ts:   "#3178c6",
  tsx:  "#3178c6",
  js:   "#f1df4e",
  jsx:  "#f1df4e",
  go:   "#00ADD8",
  rs:   "#dea584",
  java: "#b07219",
  rb:   "#cc342d",
  swift: "#F05138",
  cs:   "#178600",
  cpp:  "#f34b7d",
  c:    "#555555",
  sh:   "#89e051",
  md:   "#083fa1",
};

interface Props {
  stats: FileStat[];
}

function ExtBadge({ ext }: { ext: string }) {
  const color = EXT_COLORS[ext] ?? "#6b7280";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {ext || "?"}
    </span>
  );
}

export function FileStatsTable({ stats }: Props) {
  if (!stats.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-gray-800">Top Token-Dense Files</h2>
        <p className="text-gray-500 text-xs mt-1">Files with the most non-stopword tokens</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">File</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Type</th>
              <th className="text-right px-6 py-3 text-gray-500 font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((f, i) => (
              <tr key={f.path} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                <td className="px-6 py-3 text-gray-800 font-mono text-xs max-w-xs truncate" title={f.path}>
                  {f.path}
                </td>
                <td className="px-6 py-3">
                  <ExtBadge ext={f.extension} />
                </td>
                <td className="px-6 py-3 text-right text-gray-600 font-medium">
                  {f.token_count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
