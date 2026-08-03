'use client';

import { useState } from 'react';
import Card from '../chat/Card';
import SelectOption from '../chat/SelectOption';
import type { TourCategory } from '@/lib/adapters';

interface InterestCardProps {
  slackMin: number;       // 추천 열차의 여유 시간
  recTrainNo: string;     // 관광 기준이 되는 추천 열차 번호
  onSelect: (category: TourCategory) => void;
}

const CATEGORIES: { value: TourCategory; label: string; emoji: string }[] = [
  { value: 'cafe', label: '카페', emoji: '☕' },
  { value: 'history', label: '역사·문화', emoji: '🏛️' },
  { value: 'nature', label: '자연·공원', emoji: '🌳' },
];

/** §9: 열차가 정해진 뒤에만 묻는 관심사 카드. 어느 추천 열차 기준인지 명시. */
export default function InterestCard({ slackMin, recTrainNo, onSelect }: InterestCardProps) {
  const [selected, setSelected] = useState<TourCategory | null>(null);
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">
        추천 열차({recTrainNo}) 기준, {slackMin}분의 여유가 있어요!
      </h2>
      <p className="text-sm text-[#6B7482] mb-3">무엇을 좋아하세요? 코스를 추천해 드릴게요.</p>
      <div className="flex gap-2">
        {CATEGORIES.map((c) => (
          <SelectOption
            key={c.value}
            className="flex-1"
            selected={selected === c.value}
            onSelect={() => {
              setSelected(c.value);
              onSelect(c.value);
            }}
          >
            {c.emoji} {c.label}
          </SelectOption>
        ))}
      </div>
    </Card>
  );
}
