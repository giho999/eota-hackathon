'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/chat/Header';
import { validateSlot } from '@/lib/chat/slots';
import type { FlightInfo, TrainOption } from '@/lib/adapters';

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

type Tab = 'flight' | 'train';

/** 실시간 조회 화면 — 질문 흐름 없이 편명/열차 바로 조회 (멘토링 피드백). */
export default function LookupPage() {
  const [tab, setTab] = useState<Tab>('flight');
  const [flightNo, setFlightNo] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [trainOptions, setTrainOptions] = useState<TrainOption[] | null>(null);
  const [trainLoading, setTrainLoading] = useState(false);

  async function lookupFlight() {
    const no = flightNo.trim().toUpperCase();
    const err = validateSlot('flightNo', no);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/flight?no=${encodeURIComponent(no)}`);
      const data = await res.json();
      if (!res.ok || data.error || !data.flightNo) {
        setError(data.error ?? '편명을 찾을 수 없어요.');
        setFlightInfo(null);
        return;
      }
      setFlightInfo(data as FlightInfo);
    } catch {
      setError('조회에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function lookupTrains() {
    setTrainLoading(true);
    const now = Math.floor(Date.now() / 60000);
    // 서버 전용 어댑터는 /api/train 프록시로 조회 (클라이언트 번들 분리)
    const res = await fetch(`/api/train?from=${encodeURIComponent('대전역')}&to=${encodeURIComponent('서울역')}&after=${now}`);
    const options = (await res.json()) as TrainOption[];
    setTrainOptions(options);
    setTrainLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F3F5F8] text-[#1A1D23]">
      <Header current={0} total={0} />
      <div className="mx-auto max-w-lg px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#10315C]">실시간 조회</h1>
          <Link href="/" className="text-sm text-[#1E63B8] hover:underline">
            ← 챗봇으로 돌아가기
          </Link>
        </div>

        {/* 탭 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('flight')}
            aria-pressed={tab === 'flight'}
            className={`flex-1 px-4 py-3 rounded-[12px] border-2 btn-spring ${
              tab === 'flight'
                ? 'btn-selected'
                : 'border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]'
            }`}
          >
            항공편 조회
          </button>
          <button
            type="button"
            onClick={() => setTab('train')}
            aria-pressed={tab === 'train'}
            className={`flex-1 px-4 py-3 rounded-[12px] border-2 btn-spring ${
              tab === 'train'
                ? 'btn-selected'
                : 'border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]'
            }`}
          >
            열차편 조회
          </button>
        </div>

        {tab === 'flight' && (
          <div className="bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
            <h2 className="font-bold text-[#1A1D23] mb-1">항공편 상태 확인</h2>
            <p className="text-sm text-[#6B7482] mb-3">편명을 입력하면 실시간 운항 상태를 보여드려요.</p>
            <div className="flex gap-2">
              <input
                value={flightNo}
                onChange={(e) => setFlightNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupFlight()}
                placeholder="KE1234"
                className="flex-1 px-3 py-2 border border-[#DCE2EA] rounded-[12px] text-[#1A1D23] focus:outline-none focus:border-[#1E63B8]"
              />
              <button
                type="button"
                onClick={lookupFlight}
                disabled={loading}
                className="px-4 py-2 bg-[#1E63B8] text-white rounded-[12px] font-medium btn-spring disabled:opacity-50"
              >
                {loading ? '확인 중…' : '조회'}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-[#B3271E]">{error}</p>}
            {flightInfo && (
              <div className="mt-3 bg-[#E9F0FA] rounded-[12px] px-4 py-3 text-sm text-[#1A1D23]">
                <p className="font-semibold">
                  {flightInfo.airline} {flightInfo.flightNo}
                </p>
                <p className="text-[#6B7482]">
                  {flightInfo.origin} → 인천공항 {flightInfo.terminal} · {fmt(flightInfo.scheduledArrivalMin)} 도착
                </p>
                <p className="mt-1">
                  실시간 지연:{' '}
                  <span className={`font-semibold ${flightInfo.avgDelayMin > 0 ? 'text-[#B0730A]' : 'text-[#127A4B]'}`}>
                    {flightInfo.avgDelayMin > 0 ? `+${flightInfo.avgDelayMin}분` : '지연 없음'}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'train' && (
          <div className="bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
            <h2 className="font-bold text-[#1A1D23] mb-1">열차편 시각표</h2>
            <span className="inline-block text-xs text-[#B0730A] bg-[#F3F5F8] border border-[#DCE2EA] rounded-full px-3 py-1 mb-3">
              ⚠️ 실시간 배차 정보 아님 — 참고용 시각표
            </span>
            <button
              type="button"
              onClick={lookupTrains}
              disabled={trainLoading}
              className="w-full px-4 py-2 bg-[#1E63B8] text-white rounded-[12px] font-medium btn-spring disabled:opacity-50"
            >
              {trainOptions ? '다시 불러오기' : '대전역 → 서울역 시각표 보기'}
            </button>
            {trainOptions && (
              <ul className="mt-3 flex flex-col gap-2">
                {trainOptions.map((t) => (
                  <li key={t.trainNo} className="border-t border-[#DCE2EA] pt-2 text-sm">
                    <span className="font-semibold text-[#1A1D23]">{t.trainNo}</span>{' '}
                    <span className="text-xs text-[#6B7482]">{t.trainType}</span>
                    <span className="float-right text-[#6B7482]">
                      {fmt(t.departureMin)} → {fmt(t.arrivalMin)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
