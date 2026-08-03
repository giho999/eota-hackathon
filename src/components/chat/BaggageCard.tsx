'use client';

import { useState } from 'react';
import Card from './Card';
import SelectOption from './SelectOption';

interface BaggageCardProps {
  onSelect: (checked: boolean) => void;
}

export default function BaggageCard({ onSelect }: BaggageCardProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">위탁 수하물이 있나요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">있으면 수하물 수취 시간이 추가돼요</p>
      <div className="flex gap-2">
        <SelectOption
          className="flex-1"
          selected={selected === true}
          onSelect={() => {
            setSelected(true);
            onSelect(true);
          }}
        >
          위탁 수하물 있음
        </SelectOption>
        <SelectOption
          className="flex-1"
          selected={selected === false}
          onSelect={() => {
            setSelected(false);
            onSelect(false);
          }}
        >
          기내 수하물만
        </SelectOption>
      </div>
    </Card>
  );
}
