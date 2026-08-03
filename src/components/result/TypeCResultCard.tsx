'use client';

import { useState } from 'react';
import type { TypeCScenario } from '@/lib/chat/result';
import { recommendTrainC } from '@/lib/chat/result';
import { useCountUp } from '@/lib/useCountUp';
import ProbabilityBar from './ProbabilityBar';
import Timeline from './Timeline';
import Histogram from './Histogram';

/** 토스 잔액 카운트업 느낌의 확률 숫자 */
function CountUpPct({ value }: { value: number }) {
  return <>{useCountUp(value)}%</>;
}

interface TypeCResultCardProps {
  scenario: TypeCScenario;
  route: { from: string; to: string };
  wishTimeMin: number;
  nowMin: number;  // 유형 C 시뮬레이션 baseTime (타임라인 출발점)
  /** 열차 선택 시 호출 — 관광 기준을 선택 열차로 재계산하기 위함 */
  onSelectTrain?: (trainNo: string) => void;
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 유형 C 결과: 확률 + 열차 목록 + 근거 펼침. */
export default function TypeCResultCard({ scenario, route, wishTimeMin, nowMin, onSelectTrain }: TypeCResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(null);
  const recommended = recommendTrainC(scenario);
  const selected =
    scenario.trains.find((t) => t.train.trainNo === selectedTrainNo) ??
    recommended ??
    scenario.trains[0];
  if (!selected) return null;

  return (
    <div className="animate-rise bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      <h2 className="font-bold text-[#1A1D23] mb-1">열차 탑승 성공 확률</h2>
      <p className="text-sm text-[#6B7482] mb-4">
        {route.from} → {route.to} · {fmt(wishTimeMin)} 출발 희망
      </p>

      {recommended ? (
        <p className="mb-4 text-[#1A1D23]">
          <span className="text-3xl font-bold text-[#10315C]">
            <CountUpPct value={Math.round(recommended.result.probability * 100)} />
          </span>
          <span className="ml-2 text-sm text-[#6B7482]">
            추천 {recommended.train.trainNo} ({fmt(recommended.train.departureMin)} 출발)
          </span>
        </p>
      ) : (
        <p className="mb-4 text-sm text-[#B0730A]">
          90% 이상 확률의 열차가 아직 없어요. 희망 시각을 늦춰보세요.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {scenario.trains.map(({ train: t, result }) => {
          const isRec = recommended?.train.trainNo === t.trainNo;
          const isSelected = t.trainNo === selected.train.trainNo;
          return (
            <li key={t.trainNo} className="border-t border-[#DCE2EA] pt-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedTrainNo(t.trainNo);
                  setExpanded(true);
                  onSelectTrain?.(t.trainNo);
                }}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-[12px] px-2 py-1 -mx-2 btn-spring ${
                  isSelected ? 'btn-selected animate-micro-bounce' : 'hover:bg-[#E9F0FA]'
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-[#1A1D23]">
                    {t.trainNo}{' '}
                    <span className="text-xs font-normal text-[#6B7482]">{t.trainType}</span>
                    {isRec && (
                      <span className="ml-2 text-xs font-medium text-white bg-[#10315C] rounded-full px-2 py-0.5">
                        추천
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-[#6B7482]">
                    {fmt(t.departureMin)} → {fmt(t.arrivalMin)}
                  </span>
                  {isSelected && (
                    <span className="text-[#1E63B8] text-sm font-bold animate-check-in">✓</span>
                  )}
                </div>
                <ProbabilityBar probability={result.probability} />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-4 w-full flex items-center justify-between px-4 py-3 rounded-[12px] bg-[#E9F0FA] text-[#10315C] font-medium"
      >
        <span>왜 이 확률인가요?{selectedTrainNo ? ` (${selected.train.trainNo})` : ''}</span>
        <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold text-[#1A1D23] mb-3">
              {selected.train.trainNo} 구간별 예상 소요
            </h3>
            <Timeline
              result={selected.result}
              baseTimeMin={nowMin}
              departureMin={selected.train.departureMin}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1D23] mb-2">
              {selected.train.trainNo} 도착 시각 분포
            </h3>
            <Histogram
              result={selected.result}
              baseTimeMin={nowMin}
              deadlineMin={selected.train.departureMin}
            />
          </div>
        </div>
      )}
    </div>
  );
}
