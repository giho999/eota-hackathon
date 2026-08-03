'use client';

import type { ReactNode } from 'react';

interface SelectOptionProps {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** 선택형 버튼 공통. 선택 시 blueL 배경+blue 2px 테두리+✓ 스케일 등장+마이크로 바운스.
 *  선택 상태는 계속 유지 (잠깐 반짝이고 사라지지 않음), 해제 시 체크 fade-out. */
export default function SelectOption({
  selected,
  onSelect,
  children,
  disabled,
  className = '',
}: SelectOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'relative rounded-[12px] border-2 px-4 py-3 btn-spring',
        selected
          ? 'btn-selected'
          : 'border-[#DCE2EA] bg-white text-[#1A1D23] font-medium hover:bg-[#E9F0FA]',
        selected ? 'animate-micro-bounce' : '',
        disabled ? 'opacity-50' : '',
        className,
      ].join(' ')}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-[#1E63B8] text-sm font-bold ${
          selected
            ? 'opacity-100 animate-check-in'
            : 'opacity-0 scale-50 animate-check-out'
        }`}
      >
        ✓
      </span>
    </button>
  );
}
