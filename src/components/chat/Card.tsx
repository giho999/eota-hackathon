import type { ReactNode } from 'react';

/** 카드 공통 래퍼. radius 12px, 그림자 없음, 등장 시 슬라이드업+페이드인. */
export default function Card({ children }: { children: ReactNode }) {
  return (
    <div className="animate-rise bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      {children}
    </div>
  );
}
