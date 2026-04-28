import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { FrequencyStat } from "../types";

const COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#38bdf8",
];

interface Props {
  stats: FrequencyStat[];
}

export function FrequencyChart({ stats }: Props) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Top 20 Word Frequencies
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={stats} layout="vertical" margin={{ left: 80, right: 16 }}>
          <XAxis type="number" />
          <YAxis
            dataKey="word"
            type="category"
            width={80}
            tick={{ fontSize: 13 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value} occurrences`, "Count"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {stats.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
