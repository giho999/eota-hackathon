'use client';

import type { SimulationResult } from '@/lib/engine';

interface TimelineProps {
  result: SimulationResult;
  baseTimeMin: number;
  departureMin: number;
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** §8.2 근거 타임라인. 도착 → 구간별 누적 시각·누적 소요, 마지막에 열차 출발·여유 표시. */
export default function Timeline({ result, baseTimeMin, departureMin }: TimelineProps) {
  const rows = [
    { label: '항공 도착 예정', time: baseTimeMin, delta: null as number | null, cumulative: 0 },
    ...result.timeline.map((t) => ({
      label: t.label,
      time: t.cumulativeMin,
      delta: t.meanMinutes,
      cumulative: Math.round(t.cumulativeMin - baseTimeMin),
    })),
  ];
  const lastTime = result.timeline[result.timeline.length - 1]?.cumulativeMin ?? baseTimeMin;
  const slackMin = departureMin - lastTime;

  return (
    <ol className="relative border-l-2 border-[#DCE2EA] ml-2 pl-4 flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#1E63B8]" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-[#1A1D23]">{r.label}</span>
            <span className="text-sm text-[#6B7482] tabular-nums">{fmt(r.time)}</span>
          </div>
          <p className="text-xs text-[#6B7482] mt-0.5">
            {r.delta !== null ? `+${Math.round(r.delta)}분 · 누적 ${r.cumulative}분` : '출발 전'}
          </p>
        </li>
      ))}
      <li className="relative">
        <span className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#10315C]" />
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-[#10315C]">KTX 출발</span>
          <span className="text-sm text-[#6B7482] tabular-nums">{fmt(departureMin)}</span>
        </div>
        <p className={`text-xs mt-0.5 ${slackMin >= 0 ? 'text-[#127A4B]' : 'text-[#B3271E]'}`}>
          {slackMin >= 0 ? `여유 ${Math.round(slackMin)}분` : `부족 ${Math.round(-slackMin)}분`}
        </p>
      </li>
    </ol>
  );
}
