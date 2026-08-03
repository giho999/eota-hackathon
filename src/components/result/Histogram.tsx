'use client';

import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { SimulationResult } from '@/lib/engine';

interface HistogramProps {
  result: SimulationResult;
  baseTimeMin: number;
  deadlineMin: number;
}

/** §8.2 분포 히스토그램. X축은 도착 후 경과 분, deadlineMin에 임계선. */
export default function Histogram({ result, baseTimeMin, deadlineMin }: HistogramProps) {
  const data = result.histogram.map((b) => ({
    x: Math.round((b.binStart + b.binEnd) / 2 - baseTimeMin),
    count: b.count,
  }));
  const deadlineX = Math.round(deadlineMin - baseTimeMin);
  const pct = Math.round(result.probability * 100);
  // 임계선이 그래프 오른쪽 밖에 있으면 X축 범위를 늘려 항상 보이게
  const maxX = Math.max(...data.map((d) => d.x), deadlineX);

  return (
    <div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, maxX]}
            tickFormatter={(v: number) => `${v}분`}
            tick={{ fontSize: 11, fill: '#6B7482' }}
            axisLine={{ stroke: '#DCE2EA' }}
            tickLine={false}
          />
          <YAxis hide />
          <ReferenceLine
            x={deadlineX}
            stroke="#B3271E"
            strokeDasharray="4 4"
            label={{ value: `임계선 ${pct}%`, position: 'top', fill: '#B3271E', fontSize: 11 }}
          />
          <Bar dataKey="count" fill="#1E63B8" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-[#6B7482] mt-1">
        빨간 임계선 왼쪽 영역 = 성공 ({pct}%)
      </p>
    </div>
  );
}
