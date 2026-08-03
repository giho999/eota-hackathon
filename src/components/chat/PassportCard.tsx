'use client';

import { useState } from 'react';
import Card from './Card';
import SelectOption from './SelectOption';

interface PassportCardProps {
  onSelect: (passport: 'domestic' | 'foreign') => void;
}

export default function PassportCard({ onSelect }: PassportCardProps) {
  const [selected, setSelected] = useState<'domestic' | 'foreign' | null>(null);
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">어떤 여권으로 입국하나요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">심사 시간이 달라져요</p>
      <div className="flex gap-2">
        <SelectOption
          className="flex-1"
          selected={selected === 'domestic'}
          onSelect={() => {
            setSelected('domestic');
            onSelect('domestic');
          }}
        >
          내국인
        </SelectOption>
        <SelectOption
          className="flex-1"
          selected={selected === 'foreign'}
          onSelect={() => {
            setSelected('foreign');
            onSelect('foreign');
          }}
        >
          외국인
        </SelectOption>
      </div>
    </Card>
  );
}
