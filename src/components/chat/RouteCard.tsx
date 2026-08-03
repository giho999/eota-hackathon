'use client';

import { useState } from 'react';
import Card from './Card';
import SelectOption from './SelectOption';
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
          <SelectOption
            key={s}
            className="px-3 py-2"
            selected={from === s}
            onSelect={() => setFrom(s)}
          >
            {s}
          </SelectOption>
        ))}
      </div>

      <label className="block text-xs text-[#6B7482] mb-1">도착역</label>
      <div className="flex flex-wrap gap-2">
        {STATIONS.filter((s) => s !== from).map((s) => (
          <SelectOption
            key={s}
            className="px-3 py-2"
            selected={to === s}
            onSelect={() => setTo(s)}
          >
            {s}
          </SelectOption>
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
