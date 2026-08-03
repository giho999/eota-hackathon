'use client';

import { useState } from 'react';
import Card from './Card';
import type { FlightInfo } from '@/lib/adapters';
import { validateSlot } from '@/lib/chat/slots';

interface FlightCardProps {
  onConfirmed: (info: FlightInfo) => void;
  direction?: 'arr' | 'dep';  // 유형 A(도착) / 유형 B(출발)
}

const fmt = (min: number) =>
  new Date(min * 60000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

export default function FlightCard({ onConfirmed, direction = 'arr' }: FlightCardProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const isDep = direction === 'dep';

  async function lookup() {
    const flightNo = value.trim().toUpperCase();
    const err = validateSlot('flightNo', flightNo);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/flight?no=${encodeURIComponent(flightNo)}&direction=${direction}`);
      const data = await res.json();
      if (!res.ok || data.error || !data.flightNo) {
        setError(data.error ?? '편명을 찾을 수 없어요. 다시 확인해 주세요.');
        setInfo(null);
        return;
      }
      setInfo(data as FlightInfo);
    } catch {
      setError('항공편 조회에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">
        {isDep ? '출발 항공편이 뭔가요?' : '도착 항공편이 뭔가요?'}
      </h2>
      <p className="text-sm text-[#6B7482] mb-3">{isDep ? '예: OZ301' : '예: KE1234'}</p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder={isDep ? 'OZ301' : 'KE1234'}
          className="flex-1 px-3 py-2 border border-[#DCE2EA] rounded-[12px] text-[#1A1D23] focus:outline-none focus:border-[#1E63B8]"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading}
          className="px-4 py-2 bg-[#1E63B8] text-white rounded-[12px] font-medium disabled:opacity-50 btn-spring"
        >
          {loading ? '확인 중…' : '확인'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[#B3271E]">{error}</p>}
      {info && (
        <div className="mt-3 bg-[#E9F0FA] rounded-[12px] px-4 py-3 text-sm text-[#1A1D23]">
          <p className="font-semibold">
            {info.airline} {info.flightNo}
          </p>
          <p className="text-[#6B7482]">
            {isDep
              ? `인천공항 ${info.terminal} → ${info.origin} · ${fmt(info.scheduledArrivalMin)} 출발 · 탑승마감 ${fmt(info.boardingDeadlineMin ?? info.scheduledArrivalMin - 40)}`
              : `${info.origin} → 인천공항 ${info.terminal} · ${fmt(info.scheduledArrivalMin)} 도착 · 평균 지연 ${info.avgDelayMin}분`}
          </p>
          <button
            type="button"
            onClick={() => onConfirmed(info)}
            className="mt-2 w-full px-4 py-2 bg-[#1E63B8] text-white rounded-[12px] font-medium btn-spring"
          >
            맞아요, 이 항공편이에요
          </button>
        </div>
      )}
    </Card>
  );
}
