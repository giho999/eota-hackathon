'use client';

import { useCountUp } from '@/lib/useCountUp';

interface ProbabilityBarProps {
  probability: number; // 0..1
}

/** 확률 막대. 등급 색상(§8.1): 80% 이상 blue, 50~80% amber, 미만 red.
 *  숫자 카운트업 + 막대 채움을 같은 타이밍(500ms 스프링)으로. */
export default function ProbabilityBar({ probability }: ProbabilityBarProps) {
  const targetPct = Math.round(probability * 100);
  const shownPct = useCountUp(targetPct);
  const color = targetPct >= 80 ? '#1E63B8' : targetPct >= 50 ? '#B0730A' : '#B3271E';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#E9F0FA] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full animate-bar-fill"
          style={{ width: `${shownPct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>
        {shownPct}%
      </span>
    </div>
  );
}
