'use client';

import Card from './Card';

interface BufferCardProps {
  estimateMinutes: number;
  onSelect: (bufferMin: number) => void;
  variant?: 'arrival' | 'departure';  // 유형 A(공항 빠져나오기) / 유형 B(출국절차)
}

const OPTIONS = [
  { value: 30, label: '30분' },
  { value: 20, label: '20분' },
  { value: 10, label: '10분' },
  { value: 0, label: '타이트하게' },
];

/** 여유 시간. 반드시 마지막 카드. 앞서 예상 소요 시간을 먼저 안내(§7.2).
 *  타이트하게(buffer 0분)는 가장 빠른 열차를 확률 그대로 노출한다. */
export default function BufferCard({ estimateMinutes, onSelect, variant = 'arrival' }: BufferCardProps) {
  const headline = variant === 'departure' ? '공항 도착 후 출국절차에' : '공항을 빠져나오는 데';
  return (
    <Card>
      <h2 className="font-bold text-[#1A1D23] mb-1">마지막 질문이에요!</h2>
      <p className="mb-3 text-[#1A1D23]">
        지금까지 정보로는 <span className="font-semibold text-[#10315C]">{headline} 평균 {estimateMinutes}분</span>{' '}
        정도 걸릴 것 같아요. 열차를 잡을 때 여유를 얼마나 두고 싶나요?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className="px-4 py-3 rounded-[12px] border border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA] btn-spring"
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
