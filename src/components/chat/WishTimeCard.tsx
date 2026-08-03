'use client';

import { useState } from 'react';
import Card from './Card';

interface WishTimeCardProps {
  onSelect: (timeMin: number) => void;
}

const PRESETS = [
  { label: '30분 후', offset: 30 },
  { label: '1시간 후', offset: 60 },
  { label: '2시간 후', offset: 120 },
];

/** 유형 C: 출발 희망 시각 선택 (오늘 기준, 프리셋 + 커스텀 시간). */
export default function WishTimeCard({ onSelect }: WishTimeCardProps) {
  const [custom, setCustom] = useState('');

  function pick(timeMin: number) {
    onSelect(Math.max(Math.floor(Date.now() / 60000), timeMin));
  }

  function pickCustom() {
    const m = /^(\d{1,2}):(\d{2})$/.exec(custom);
    if (!m) return;
    const now = new Date();
    const target = new Date(now);
    target.setHours(Number(m[1]), Number(m[2]), 0, 0);
    pick(Math.floor(target.getTime() / 60000));
  }

  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">언제쯤 출발하고 싶나요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">그 시각까지 역에 도착할 확률을 계산해요</p>
      <div className="flex gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.offset}
            type="button"
            onClick={() => pick(Math.floor(Date.now() / 60000) + p.offset)}
            className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="time"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="flex-1 px-3 py-2 border border-[#DCE2EA] rounded-[12px] text-[#1A1D23] focus:outline-none focus:border-[#1E63B8]"
        />
        <button
          type="button"
          onClick={pickCustom}
          disabled={!custom}
          className="px-4 py-2 bg-[#1E63B8] text-white rounded-[12px] font-medium disabled:opacity-50"
        >
          이 시각
        </button>
      </div>
    </Card>
  );
}
