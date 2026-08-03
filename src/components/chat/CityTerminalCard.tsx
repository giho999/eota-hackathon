'use client';

import { useState } from 'react';
import Card from './Card';
import SelectOption from './SelectOption';

interface CityTerminalCardProps {
  onSelect: (useCityTerminal: boolean) => void;
}

/** 도심공항터미널(서울역·광명역) 사전 체크인 여부. 유형 B 차별점 (§4.3). */
export default function CityTerminalCard({ onSelect }: CityTerminalCardProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">도심공항터미널에서 미리 체크인할까요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">
        사전 체크인하면 공항 체크인·보안검색 대기가 줄어요
      </p>
      <div className="flex gap-2">
        <SelectOption
          className="flex-1"
          selected={selected === true}
          onSelect={() => {
            setSelected(true);
            onSelect(true);
          }}
        >
          네, 미리 할게요
        </SelectOption>
        <SelectOption
          className="flex-1"
          selected={selected === false}
          onSelect={() => {
            setSelected(false);
            onSelect(false);
          }}
        >
          아니요, 공항에서 할게요
        </SelectOption>
      </div>
    </Card>
  );
}
