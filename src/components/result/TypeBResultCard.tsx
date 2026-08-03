'use client';

import { useState } from 'react';
import type { TypeBScenario, TrainResult } from '@/lib/chat/result';
import { recommendTrainB } from '@/lib/chat/result';
import ProbabilityBar from './ProbabilityBar';
import Timeline from './Timeline';
import Histogram from './Histogram';

interface TypeBResultCardProps {
  scenarios: TypeBScenario[];   // [공항 체크인, 도심공항터미널] 2-case
  departureStation: string;
  deadlineMin: number;
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 유형 B 결과: 도심공항터미널 이용 여부 2-case 비교 (§4.3 차별점). */
export default function TypeBResultCard({ scenarios, departureStation, deadlineMin }: TypeBResultCardProps) {
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

  return (
    <div className="bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      <h2 className="font-bold text-[#1A1D23] mb-1">출국 가능 확률</h2>
      <p className="text-sm text-[#6B7482] mb-4">
        {departureStation} → 인천공항 · 탑승마감 {fmt(deadlineMin)}
      </p>

      {/* §4.3 도심공항터미널 비교 카드 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className={`rounded-[12px] border px-4 py-3 ${!bestCity ? 'border-[#1E63B8] bg-[#E9F0FA]' : 'border-[#DCE2EA] bg-white'}`}>
          <p className="text-xs font-medium text-[#10315C]">인천공항에서 체크인</p>
          <p className="font-semibold text-[#1A1D23] mt-0.5">
            {airportRec.train.trainNo}{' '}
            <span className="text-xs font-normal text-[#6B7482]">({fmt(airportRec.train.departureMin)} 출발)</span>
          </p>
          <ProbabilityBar probability={airportRec.result.probability} />
        </div>
        <div className={`rounded-[12px] border px-4 py-3 ${bestCity ? 'border-[#1E63B8] bg-[#E9F0FA]' : 'border-[#DCE2EA] bg-white'}`}>
          <p className="text-xs font-medium text-[#10315C]">도심공항터미널 사전 체크인</p>
          <p className="font-semibold text-[#1A1D23] mt-0.5">
            {cityRec.train.trainNo}{' '}
            <span className="text-xs font-normal text-[#6B7482]">({fmt(cityRec.train.departureMin)} 출발)</span>
          </p>
          <ProbabilityBar probability={cityRec.result.probability} />
        </div>
      </div>

      <p className="text-sm text-[#1A1D23] mb-3">
        도심공항터미널을 이용하면{' '}
        <span className="font-bold text-[#10315C]">
          {Math.round(cityRec.result.probability * 100) - Math.round(airportRec.result.probability * 100)}%p
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
                }}
                className={`w-full text-left rounded-[12px] px-2 py-1 -mx-2 transition-colors ${
                  isSelected ? 'bg-[#E9F0FA]' : 'hover:bg-[#E9F0FA]'
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
