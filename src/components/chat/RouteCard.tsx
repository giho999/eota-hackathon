'use client';

import { useState } from 'react';
import Card from './Card';
import { STATION_MAP } from '@/lib/chat/nlu';

interface RouteCardProps {
  onSelect: (route: { from: string; to: string }) => void;
}

const STATIONS = [...new Set(Object.values(STATION_MAP))];

/** 유형 C: 출발역 → 도착역 한 카드에서 선택. */
export default function RouteCard({ onSelect }: RouteCardProps) {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">어디에서 어디로 가나요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">출발역과 도착역을 선택해 주세요</p>

      <label className="block text-xs text-[#6B7482] mb-1">출발역</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {STATIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFrom(s)}
            className={`px-3 py-2 rounded-[12px] border text-sm btn-spring ${
              from === s
                ? 'border-[#1E63B8] bg-[#E9F0FA] text-[#10315C] font-medium'
                : 'border-[#DCE2EA] bg-white text-[#1A1D23] hover:bg-[#E9F0FA]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <label className="block text-xs text-[#6B7482] mb-1">도착역</label>
      <div className="flex flex-wrap gap-2">
        {STATIONS.filter((s) => s !== from).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTo(s)}
            className={`px-3 py-2 rounded-[12px] border text-sm btn-spring ${
              to === s
                ? 'border-[#1E63B8] bg-[#E9F0FA] text-[#10315C] font-medium'
                : 'border-[#DCE2EA] bg-white text-[#1A1D23] hover:bg-[#E9F0FA]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {from && to && (
        <button
          type="button"
          onClick={() => onSelect({ from, to })}
          className="mt-4 w-full px-4 py-3 bg-[#1E63B8] text-white rounded-[12px] font-medium btn-spring"
        >
          {from} → {to} 확인
        </button>
      )}
    </Card>
  );
}
