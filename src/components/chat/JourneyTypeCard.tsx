'use client';

import { useState } from 'react';
import Card from './Card';
import SelectOption from './SelectOption';
import type { JourneyType } from '@/lib/chat/slots';

interface JourneyTypeCardProps {
  onSelect: (type: JourneyType) => void;
}

const OPTIONS: { type: JourneyType; label: string; enabled: boolean }[] = [
  { type: 'A', label: '비행기 → 기차', enabled: true },
  { type: 'B', label: '기차 → 비행기', enabled: true },
  { type: 'C', label: '기차만', enabled: true },
];

export default function JourneyTypeCard({ onSelect }: JourneyTypeCardProps) {
  const [selected, setSelected] = useState<JourneyType | null>(null);
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-3">어떤 여정인가요?</h2>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <SelectOption
            key={o.type}
            selected={selected === o.type}
            disabled={!o.enabled}
            onSelect={() => {
              setSelected(o.type);
              onSelect(o.type);
            }}
          >
            {o.label}
            {!o.enabled && <span className="ml-2 text-xs text-[#6B7482]">다음 Phase에서 제공</span>}
          </SelectOption>
        ))}
      </div>
    </Card>
  );
}
