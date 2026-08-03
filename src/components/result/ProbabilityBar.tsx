'use client';

interface ProbabilityBarProps {
  probability: number; // 0..1
}

/** 확률 막대. 등급 색상(§8.1): 80% 이상 blue, 50~80% amber, 미만 red. */
export default function ProbabilityBar({ probability }: ProbabilityBarProps) {
  const pct = Math.round(probability * 100);
  const color = pct >= 80 ? '#1E63B8' : pct >= 50 ? '#B0730A' : '#B3271E';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#E9F0FA] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}
