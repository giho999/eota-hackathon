'use client';

import type { TourCategory } from '@/lib/adapters';
import type { BudgetedCourse } from '@/lib/tour/budget';
import { budgetUsedRatio } from '@/lib/tour/budget';
import SpotMap from './SpotMap';

interface TourListCardProps {
  courses: BudgetedCourse[];
  remainingMin: number;
  category: TourCategory;
  station?: string;  // 지도 중심 표시용 역 이름
}

const CATEGORY_LABEL: Record<TourCategory, string> = {
  cafe: '카페',
  history: '역사·문화',
  nature: '자연·공원',
};

// 역별 지도 중심 좌표 (카카오맵 위경도)
const STATION_CENTER: Record<string, { lat: number; lng: number }> = {
  서울역: { lat: 37.5547, lng: 126.9726 },
  광명역: { lat: 37.4166, lng: 126.8845 },
  대전역: { lat: 36.3323, lng: 127.4343 },
  인천공항: { lat: 37.4602, lng: 126.4507 },
};

/** §9 코스 목록: 분해 + 예산 대비 소진 막대 + 지도(상시 표시).
 *  카카오맵 키가 없으면 지도만 생략되고 리스트는 그대로 보인다. */
export default function TourListCard({ courses, remainingMin, category, station = '서울역' }: TourListCardProps) {
  const center = STATION_CENTER[station] ?? STATION_CENTER['서울역'];

  return (
    <div className="animate-rise bg-white border border-[#DCE2EA] rounded-[12px] px-5 py-4">
      <h2 className="font-bold text-[#1A1D23] mb-1">{CATEGORY_LABEL[category]} 코스 추천</h2>
      <p className="text-sm text-[#6B7482] mb-4">
        {station} 기준 · 대기 시간 {remainingMin}분 중 {courses.length}곳 추천
      </p>

      <div className="mb-4">
        <SpotMap
          spots={courses.map((c) => c.spot)}
          center={{ lat: center.lat, lng: center.lng, label: station }}
        />
      </div>

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
