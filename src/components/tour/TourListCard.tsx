'use client';

import type { TourCategory } from '@/lib/adapters';
import type { BudgetedCourse } from '@/lib/tour/budget';
import { budgetUsedRatio } from '@/lib/tour/budget';

interface TourListCardProps {
  courses: BudgetedCourse[];
  remainingMin: number;
  category: TourCategory;
}

const CATEGORY_LABEL: Record<TourCategory, string> = {
  cafe: '카페',
  history: '역사·문화',
  nature: '자연·공원',
};

/** §9 코스 목록: 분해 + 예산 대비 소진 막대. */
export default function TourListCard({ courses, remainingMin, category }: TourListCardProps) {
  return (
    <div className="bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      <h2 className="font-bold text-[#1A1D23] mb-1">{CATEGORY_LABEL[category]} 코스 추천</h2>
      <p className="text-sm text-[#6B7482] mb-4">대기 시간 {remainingMin}분 중 {courses.length}곳 추천</p>
      <ul className="flex flex-col gap-3">
        {courses.map((c) => {
          const { spot, totalMin, slackMin, budgetMin } = c;
          const used = budgetUsedRatio(c);
          return (
            <li key={spot.name} className="border-t border-[#DCE2EA] pt-3">
              <p className="font-semibold text-[#1A1D23]">{spot.name}</p>
              <p className="text-sm text-[#6B7482] mt-0.5">
                도보 {spot.walkMin}분 · 머무름 {spot.stayMin}분 · 복귀 {spot.walkMin}분 = {totalMin}분,
                여유 {slackMin}분
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#E9F0FA] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1E63B8]"
                    style={{ width: `${Math.round(used * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[#6B7482] tabular-nums whitespace-nowrap">
                  {budgetMin}분 중 {totalMin}분 사용
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
