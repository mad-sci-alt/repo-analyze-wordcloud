import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DirectoryStat } from "../types";

const COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
];

interface Props {
  stats: DirectoryStat[];
}

export function DirectoryBreakdown({ stats }: Props) {
  if (!stats.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Directory Hotspots</h2>
      <p className="text-gray-500 text-xs mb-4">Token count and top words per top-level directory</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={stats} layout="vertical" margin={{ left: 80, right: 16 }}>
          <XAxis type="number" />
          <YAxis dataKey="dir" type="category" width={80} tick={{ fontSize: 13 }} />
          <Tooltip
            formatter={(_value: number, _name: string, props: { payload?: DirectoryStat }) => {
              const d = props.payload;
              if (!d) return ["—", "Tokens"];
              return [
                <div key="tip" className="text-sm">
                  <div className="font-medium">{d.token_count.toLocaleString()} tokens</div>
                  <div className="text-gray-500">{d.file_count} files</div>
                  {d.top_words.length > 0 && (
                    <div className="text-gray-400 text-xs mt-1">
                      Top: {d.top_words.map((w) => w.word).join(", ")}
                    </div>
                  )}
                </div>,
                "Tokens",
              ];
            }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="token_count" radius={[0, 4, 4, 0]}>
            {stats.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
