import type { ReactNode } from 'react';

/** 카드 공통 래퍼. radius 12px, 그림자 없음, 단일 스크롤용 max-w. */
export default function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      {children}
    </div>
  );
}
