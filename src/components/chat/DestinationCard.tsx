'use client';

import { useState } from 'react';
import Card from './Card';
import { STATION_MAP } from '@/lib/chat/nlu';

interface DestinationCardProps {
  onSelect: (station: string) => void;
}

export default function DestinationCard({ onSelect }: DestinationCardProps) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const candidates = query.trim()
    ? Object.entries(STATION_MAP)
        .filter(([k]) => query.includes(k) || k.includes(query) || query.includes(k.slice(0, 1)))
        .slice(0, 4)
    : [];

  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">최종 목적지가 어디인가요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">하차역을 찾기 위해 지역명을 입력해 주세요</p>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPicked(null);
        }}
        placeholder="예: 대전"
        className="w-full px-3 py-2 border border-[#DCE2EA] rounded-[12px] text-[#1A1D23] focus:outline-none focus:border-[#1E63B8]"
      />
      {candidates.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {candidates.map(([key, station]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setPicked(station);
                onSelect(station);
              }}
              className="text-left px-4 py-2 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] hover:bg-[#E9F0FA]"
            >
              {key} → <span className="font-medium">{station}</span>
            </button>
          ))}
        </div>
      )}
      {picked && <p className="mt-2 text-sm text-[#127A4B]">{picked}으로 안내할게요.</p>}
    </Card>
  );
}
