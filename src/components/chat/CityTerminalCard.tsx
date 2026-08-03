'use client';

import Card from './Card';

interface CityTerminalCardProps {
  onSelect: (useCityTerminal: boolean) => void;
}

/** 도심공항터미널(서울역·광명역) 사전 체크인 여부. 유형 B 차별점 (§4.3). */
export default function CityTerminalCard({ onSelect }: CityTerminalCardProps) {
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">도심공항터미널에서 미리 체크인할까요?</h2>
      <p className="text-sm text-[#6B7482] mb-3">
        사전 체크인하면 공항 체크인·보안검색 대기가 줄어요
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(true)}
          className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]"
        >
          네, 미리 할게요
        </button>
        <button
          type="button"
          onClick={() => onSelect(false)}
          className="flex-1 px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]"
        >
          아니요, 공항에서 할게요
        </button>
      </div>
    </Card>
  );
}
