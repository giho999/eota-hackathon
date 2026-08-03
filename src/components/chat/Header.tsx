interface HeaderProps {
  current: number;
  total: number;
}

/** 헤더: 타이틀 + 진행 표시 "질문 2 / 5" (끝나면 숨김) */
export default function Header({ current, total }: HeaderProps) {
  const inProgress = current >= 1 && current <= total && total > 0;
  return (
    <header className="sticky top-0 z-10 bg-[#10315C] text-white px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-bold">이어타 (EOTA)</h1>
      {inProgress && (
        <span className="text-sm bg-white/15 rounded-full px-3 py-1">
          질문 {current} / {total}
        </span>
      )}
    </header>
  );
}
