'use client';

import Card from './Card';

interface BaggageCardProps {
  onSelect: (checked: boolean) => void;
}

export default function BaggageCard({ onSelect }: BaggageCardProps) {
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">위탁 수하물이 있나요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">있으면 수하물 수취 시간이 추가돼요</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(true)}
          className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA] btn-spring"
        >
          위탁 수하물 있음
        </button>
        <button
          type="button"
          onClick={() => onSelect(false)}
          className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA] btn-spring"
        >
          기내 수하물만
        </button>
      </div>
    </Card>
  );
}
