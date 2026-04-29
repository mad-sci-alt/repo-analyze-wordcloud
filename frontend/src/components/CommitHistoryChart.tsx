import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CommitSnapshot } from "../types";

const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1df4e",
  TypeScript: "#3178c6",
  Python:     "#3572A5",
  Go:         "#00ADD8",
  Rust:       "#dea584",
  Java:       "#b07219",
  Shell:      "#89e051",
  Other:      "#6b7280",
};

interface Props {
  history: CommitSnapshot[];
}

const LANG_LIST = ["JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "Shell"];

export function CommitHistoryChart({ history }: Props) {
  if (!history.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Commit History</h2>
      <p className="text-gray-500 text-xs mb-4">
        Code volume and language composition over the last {history.length} days
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history} margin={{ left: 0, right: 16 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {LANG_LIST.map((lang) => (
            <Line
              key={lang}
              type="monotone"
              dataKey={`langs.${lang}`}
              name={lang}
              stroke={LANG_COLORS[lang] ?? "#6b7280"}
              strokeWidth={2}
              dot={false}
            />
          ))}
          <Line
            type="monotone"
            dataKey="total_lines"
            name="Total Lines"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
