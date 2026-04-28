import type { ProgressInfo } from "../types";

const STAGE_ICONS: Record<string, string> = {
  cloning: "⬇️",
  tokenizing: "🔍",
  generating: "🎨",
};

interface Props {
  progress?: ProgressInfo;
}

export function StatusIndicator({ progress }: Props) {
  const stage = progress?.stage ?? "cloning";
  const message = progress?.message ?? "Starting...";

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-bounce" key={stage}>
          {STAGE_ICONS[stage] ?? "⏳"}
        </span>
        <span className="text-gray-500 capitalize">{stage}</span>
      </div>
      <p className="text-gray-600 text-sm">{message}</p>
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
