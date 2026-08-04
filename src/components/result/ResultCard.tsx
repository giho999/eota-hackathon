'use client';

import { useState } from 'react';
import type { ScenarioResult, TrainResult } from '@/lib/chat/result';
import { bestTrain, recommendTrain, tightestTrain } from '@/lib/chat/result';
import ProbabilityBar from './ProbabilityBar';
import Timeline from './Timeline';
import Histogram from './Histogram';
import AlternativeCards from './AlternativeCards';

interface ResultCardProps {
  scenarios: ScenarioResult[];
  activeScenarioId: string;
  baggageChecked: boolean;
  bufferTimeMin: number;
  baseTimeMin: number;
  onSelectScenario: (id: string) => void;
  onToggleBaggage: (checked: boolean) => void;
  /** 열차 선택 시 호출 — 관광 기준을 선택 열차로 재계산하기 위함 */
  onSelectTrain?: (trainNo: string) => void;
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 결과 카드: 추천 열차 + 목록(클릭 시 선택) + 배기지 토글 + 근거 펼침(§8.1, §8.2). */
export default function ResultCard({
  scenarios,
  activeScenarioId,
  baggageChecked,
  bufferTimeMin,
  baseTimeMin,
  onSelectScenario,
  onToggleBaggage,
  onSelectTrain,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(null);
  const active = scenarios.find((s) => s.config.id === activeScenarioId) ?? scenarios[0];
  const safe = recommendTrain(active);
  const tight = tightestTrain(active);
  const recommended = safe ?? tight;
  const sameTrain = safe !== null && safe.train.trainNo === tight.train.trainNo;
  const selected =
    active.trains.find((t) => t.train.trainNo === selectedTrainNo) ?? recommended;
  const lowProbability = recommended.result.probability < 0.5;

  function pickTrain(trainNo: string) {
    setSelectedTrainNo(trainNo);
    setExpanded(true);
    onSelectTrain?.(trainNo);
  }

  const pickCards = safe === null
    ? [{ label: '가장 빠른 선택', tr: tight, low: tight.result.probability < 0.3 }]
    : sameTrain
      ? [{ label: '안전 추천 · 가장 빠른 선택', tr: safe, low: false }]
      : [
          { label: '안전 추천 (90% 이상)', tr: safe, low: false },
          { label: '가장 빠른 선택', tr: tight, low: tight.result.probability < 0.3 },
        ];

  return (
    <div className="animate-rise bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-[#1A1D23]">열차 탑승 성공 확률</h2>
        <button
          type="button"
          onClick={() => onToggleBaggage(!baggageChecked)}
          className="text-xs px-3 py-1.5 rounded-full border border-[#DCE2EA] text-[#6B7482] hover:bg-[#E9F0FA]"
          title="수하물 수취 시간을 계산에 넣을지 토글"
        >
          위탁 수하물 {baggageChecked ? '있음 ✓' : '없음'}
        </button>
      </div>

      {lowProbability && (
        <div className="mb-4">
          <AlternativeCards scenarios={scenarios} onSelect={onSelectScenario} />
        </div>
      )}

      <div className={`grid gap-2 mb-4 ${pickCards.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {pickCards.map(({ label, tr, low }) => {
          const isSelected = selected.train.trainNo === tr.train.trainNo;
          const displayLabel = low ? '가장 빠른 선택 (성공 가능성 낮음)' : label;
          const borderCls = low
            ? isSelected
              ? 'border-[#6B7482] bg-[#F3F5F8]'
              : 'border-[#DCE2EA] bg-white hover:bg-[#F3F5F8]'
            : isSelected
              ? 'border-[#1E63B8] bg-[#E9F0FA]'
              : 'border-[#DCE2EA] bg-white hover:bg-[#E9F0FA]';
          return (
            <button
              key={label}
              type="button"
              onClick={() => pickTrain(tr.train.trainNo)}
              className={`text-left rounded-[12px] border px-4 py-3 transition-colors btn-spring ${borderCls}`}
            >
              <p className={`text-xs font-medium ${low ? 'text-[#6B7482]' : 'text-[#10315C]'}`}>
                {displayLabel}
              </p>
              <p className="font-semibold text-[#1A1D23] mt-0.5">
                <span className="whitespace-nowrap">{tr.train.trainNo}</span>{' '}
                <span className="text-xs font-normal text-[#6B7482] whitespace-nowrap">
                  ({fmt(tr.train.departureMin)} 출발)
                </span>
                {isSelected && <span className="inline-block ml-1 animate-pop">✓</span>}
              </p>
              <ProbabilityBar probability={tr.result.probability} />
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {active.trains.map((tr: TrainResult) => {
          const { train: t, result } = tr;
          const isSafe = safe !== null && t.trainNo === safe.train.trainNo;
          const isTight = t.trainNo === tight.train.trainNo;
          const tightLow = isTight && tight.result.probability < 0.3;
          const badge = safe === null
            ? isTight
              ? tightLow
                ? '가장 빠른 선택 (성공 가능성 낮음)'
                : '가장 빠른 선택'
              : null
            : sameTrain
              ? isSafe
                ? '추천'
                : null
              : isSafe
                ? '안전 추천'
                : isTight
                  ? tightLow
                    ? '가장 빠른 선택 (성공 가능성 낮음)'
                    : '가장 빠른 선택'
                  : null;
          const isSelected = t.trainNo === selected.train.trainNo;
          return (
            <li key={t.trainNo} className="border-t border-[#DCE2EA] pt-3">
              <button
                type="button"
                onClick={() => pickTrain(t.trainNo)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-[12px] px-2 py-1 -mx-2 btn-spring ${
                  isSelected
                    ? 'btn-selected animate-micro-bounce'
                    : 'hover:bg-[#E9F0FA]'
                }`}
              >
                {/* 1줄: 열차번호+타입+배지 / 2줄: 시간구간+✓ — 좁은 화면에서 단어 중간 줄바꿈 방지 */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  <span className="font-semibold text-[#1A1D23] whitespace-nowrap">
                    {t.trainNo}{' '}
                    <span className="text-xs font-normal text-[#6B7482]">{t.trainType}</span>
                  </span>
                  {badge && (
                    <span
                      className={`whitespace-nowrap text-xs font-medium rounded-full px-2 py-0.5 ${
                        tightLow ? 'text-[#6B7482] bg-[#DCE2EA]' : 'text-white bg-[#10315C]'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[#6B7482] whitespace-nowrap tabular-nums">
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
        <span>왜 이 확률인가요?{safe !== null && selected.train.trainNo !== safe.train.trainNo ? ` (${selected.train.trainNo})` : ''}</span>
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
              baseTimeMin={baseTimeMin}
              departureMin={selected.train.departureMin}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1D23] mb-2">
              {selected.train.trainNo} 도착 시각 분포
            </h3>
            <Histogram
              result={selected.result}
              baseTimeMin={baseTimeMin}
              deadlineMin={selected.train.departureMin - bufferTimeMin}
            />
          </div>
        </div>
      )}
    </div>
  );
}
