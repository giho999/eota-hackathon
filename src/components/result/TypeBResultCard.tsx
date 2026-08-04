'use client';

import { useState } from 'react';
import type { TypeBScenario, TrainResult } from '@/lib/chat/result';
import { recommendTrainB } from '@/lib/chat/result';
import { useCountUp } from '@/lib/useCountUp';
import ProbabilityBar from './ProbabilityBar';
import Timeline from './Timeline';
import Histogram from './Histogram';

interface TypeBResultCardProps {
  scenarios: TypeBScenario[];   // [공항 체크인, 도심공항터미널] 2-case
  departureStation: string;
  deadlineMin: number;
  /** 열차 선택 시 호출 — 관광 기준을 선택 열차로 재계산하기 위함 */
  onSelectTrain?: (trainNo: string) => void;
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 유형 B 결과: 도심공항터미널 이용 여부 2-case 비교 (§4.3 차별점). */
export default function TypeBResultCard({ scenarios, departureStation, deadlineMin, onSelectTrain }: TypeBResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(null);
  const airport = scenarios[0];
  const city = scenarios[1];

  // 각 case의 추천 열차 (90% 이상 중 가장 늦은 열차)
  const airportRec = recommendTrainB(airport);
  const cityRec = recommendTrainB(city);
  const bestCity = cityRec.result.probability >= airportRec.result.probability;

  // 선택된 열차 (양쪽 case에 같은 열차가 있으면 그 열차의 양쪽 확률 비교)
  const selected = selectedTrainNo
    ? (airport.trains.find((t) => t.train.trainNo === selectedTrainNo) ?? airportRec)
    : airportRec;
  const selectedCity = selectedTrainNo
    ? city.trains.find((t) => t.train.trainNo === selectedTrainNo)
    : undefined;

  const activeCase = selectedTrainNo ? city : bestCity ? city : airport;
  const activeRec = selectedTrainNo ? (selectedCity ?? selected) : bestCity ? cityRec : airportRec;
  const diffPct = useCountUp(
    Math.round(cityRec.result.probability * 100) - Math.round(airportRec.result.probability * 100),
  );

  return (
    <div className="animate-rise bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      <h2 className="font-bold text-[#1A1D23] mb-1">출국 가능 확률</h2>
      <p className="text-sm text-[#6B7482] mb-4">
        {departureStation} → 인천공항 · 탑승마감 {fmt(deadlineMin)}
      </p>

      {/* §4.3 도심공항터미널 비교 카드 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className={`relative rounded-[12px] border-2 px-4 py-3 ${!bestCity ? 'btn-selected animate-micro-bounce' : 'border-[#DCE2EA] bg-white'}`}>
          <p className="text-xs font-medium text-[#10315C]">인천공항에서 체크인</p>
          <p className="font-semibold text-[#1A1D23] mt-0.5">
            <span className="whitespace-nowrap">{airportRec.train.trainNo}</span>{' '}
            <span className="text-xs font-normal text-[#6B7482] whitespace-nowrap">({fmt(airportRec.train.departureMin)} 출발)</span>
          </p>
          <ProbabilityBar probability={airportRec.result.probability} />
          {!bestCity && (
            <span className="absolute right-2 top-2 text-[#1E63B8] font-bold animate-check-in">✓</span>
          )}
        </div>
        <div className={`relative rounded-[12px] border-2 px-4 py-3 ${bestCity ? 'btn-selected animate-micro-bounce' : 'border-[#DCE2EA] bg-white'}`}>
          <p className="text-xs font-medium text-[#10315C]">도심공항터미널 사전 체크인</p>
          <p className="font-semibold text-[#1A1D23] mt-0.5">
            <span className="whitespace-nowrap">{cityRec.train.trainNo}</span>{' '}
            <span className="text-xs font-normal text-[#6B7482] whitespace-nowrap">({fmt(cityRec.train.departureMin)} 출발)</span>
          </p>
          <ProbabilityBar probability={cityRec.result.probability} />
          {bestCity && (
            <span className="absolute right-2 top-2 text-[#1E63B8] font-bold animate-check-in">✓</span>
          )}
        </div>
      </div>

      <p className="text-sm text-[#1A1D23] mb-3">
        도심공항터미널을 이용하면{' '}
        <span className="font-bold text-[#10315C]">
          {diffPct}%p
        </span>{' '}
        더 안정적으로 탑승할 수 있어요.
      </p>

      {/* 열차 목록: 도심공항터미널 case 기준 */}
      <h3 className="text-sm font-semibold text-[#1A1D23] mb-2">후보 열차 (도심공항터미널 기준)</h3>
      <ul className="flex flex-col gap-3">
        {city.trains.map((tr: TrainResult) => {
          const { train: t, result } = tr;
          const isRec = t.trainNo === cityRec.train.trainNo;
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
                {/* 1줄: 열차번호+타입+배지 / 2줄: 시간구간+✓ — 좁은 화면에서 단어 중간 줄바꿈 방지 */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  <span className="font-semibold text-[#1A1D23] whitespace-nowrap">
                    {t.trainNo}{' '}
                    <span className="text-xs font-normal text-[#6B7482]">{t.trainType}</span>
                  </span>
                  {isRec && (
                    <span className="whitespace-nowrap text-xs font-medium text-white bg-[#10315C] rounded-full px-2 py-0.5">
                      추천
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
        <span>왜 이 확률인가요?{selectedTrainNo ? ` (${selected.train.trainNo})` : ''}</span>
        <span className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold text-[#1A1D23] mb-3">
              {selected.train.trainNo} 구간별 예상 소요 (도심공항터미널)
            </h3>
            <Timeline
              result={activeRec.result}
              baseTimeMin={selected.train.departureMin}
              departureMin={deadlineMin}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1A1D23] mb-2">
              {selected.train.trainNo} 도착 시각 분포
            </h3>
            <Histogram
              result={activeRec.result}
              baseTimeMin={selected.train.departureMin}
              deadlineMin={deadlineMin}
            />
          </div>
          {selectedCity && (
            <p className="text-sm text-[#127A4B]">
              같은 열차 공항 체크인 확률: {Math.round(selectedCity.result.probability * 100)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}
