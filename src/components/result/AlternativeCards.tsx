'use client';

import type { ScenarioResult } from '@/lib/chat/result';
import { recommendTrain, tightestTrain } from '@/lib/chat/result';

interface AlternativeCardsProps {
  scenarios: ScenarioResult[];
  onSelect: (scenarioId: string) => void;
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

function colorOf(p: number) {
  const pct = Math.round(p * 100);
  return pct >= 80 ? '#1E63B8' : pct >= 50 ? '#B0730A' : '#B3271E';
}

/** §8.1 확률 50% 미만 시 먼저 띄우는 대안 카드. */
export default function AlternativeCards({ scenarios, onSelect }: AlternativeCardsProps) {
  const primary = scenarios.find((s) => s.config.id === 'primary');
  const transport = scenarios.find((s) => s.config.id === 'transport');
  const station = scenarios.find((s) => s.config.id === 'station');
  if (!primary || !transport || !station) return null;

  const best = recommendTrain(primary) ?? tightestTrain(primary);
  const nextTrain = primary.trains.find((t) => t.train.departureMin > best.train.departureMin);

  const cards: { icon: string; title: string; desc: string; prob: number; target: string | null }[] = [
    {
      icon: '①',
      title: '다음 열차 이용',
      desc: nextTrain
        ? `${nextTrain.train.trainNo} (${fmt(nextTrain.train.departureMin)} 출발)로 한 편 늦추기`
        : '이후 열차가 없어요. 이동 수단을 바꿔보세요',
      prob: nextTrain?.result.probability ?? 0,
      target: nextTrain ? 'primary' : null,
    },
    {
      icon: '②',
      title: '이동 수단 변경',
      desc: `${transport.config.label}로 공항을 더 빨리 빠져나오기`,
      prob: (recommendTrain(transport) ?? tightestTrain(transport)).result.probability,
      target: 'transport',
    },
    {
      icon: '③',
      title: '경유역 변경',
      desc: `${station.config.label}로 갈아타기`,
      prob: (recommendTrain(station) ?? tightestTrain(station)).result.probability,
      target: 'station',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-[#10315C]">
        이 열차는 탑승 확률이 50% 미만이에요. 대신 이렇게는 어떨까요?
      </p>
      {cards.map((c) => (
        <button
          key={c.icon}
          type="button"
          disabled={!c.target}
          onClick={() => c.target && onSelect(c.target)}
          className="text-left bg-white border border-[#DCE2EA] rounded-[12px] px-4 py-3 hover:bg-[#E9F0FA] disabled:opacity-50 disabled:hover:bg-white btn-spring"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-[#1A1D23]">
              {c.icon} {c.title}
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: colorOf(c.prob) }}>
              {Math.round(c.prob * 100)}%
            </span>
          </div>
          <p className="text-xs text-[#6B7482] mt-0.5">{c.desc}</p>
        </button>
      ))}
    </div>
  );
}
