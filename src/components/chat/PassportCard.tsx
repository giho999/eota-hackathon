'use client';

import Card from './Card';

interface PassportCardProps {
  onSelect: (passport: 'domestic' | 'foreign') => void;
}

export default function PassportCard({ onSelect }: PassportCardProps) {
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">어떤 여권으로 입국하나요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">심사 시간이 달라져요</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect('domestic')}
          className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]"
        >
          내국인
        </button>
        <button
          type="button"
          onClick={() => onSelect('foreign')}
          className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]"
        >
          외국인
        </button>
      </div>
    </Card>
  );
}
