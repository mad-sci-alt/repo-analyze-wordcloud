import { useState } from "react";
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

const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1df4e",
  TypeScript: "#3178c6",
  Python:     "#3572A5",
  Go:         "#00ADD8",
  Rust:       "#dea584",
  Java:       "#b07219",
  Ruby:       "#cc342d",
  Swift:      "#F05138",
  "C#":       "#178600",
  Shell:      "#89e051",
  HTML:       "#e34c26",
  CSS:        "#563d7c",
  Vue:        "#41b883",
  Svelte:     "#ff3e00",
  Kotlin:     "#A97BFF",
  Markdown:   "#083fa1",
  Other:      "#6b7280",
};

interface Props {
  stats: Record<string, FrequencyStat[]>;
}

const ALL_COLORS = Object.values(LANG_COLORS);

export function LanguageBreakdown({ stats }: Props) {
  const [activeLang, setActiveLang] = useState<string>(
    Object.keys(stats)[0] ?? ""
  );

  const langs = Object.keys(stats);

  if (!langs.length) return null;

  const chartData = stats[activeLang] ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Language Breakdown</h2>
      <p className="text-gray-500 text-xs mb-4">Top words per programming language</p>

      {/* Language tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {langs.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer border ${
              activeLang === lang
                ? "border-gray-800 bg-gray-800 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
            }`}
            style={
              activeLang !== lang
                ? { borderColor: (LANG_COLORS[lang] ?? "#6b7280") + "55" }
                : undefined
            }
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Bar chart per language */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ left: 0, right: 16 }}
        >
          <XAxis dataKey="word" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [`${value} times`, "Count"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={LANG_COLORS[activeLang] ?? ALL_COLORS[i % ALL_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
