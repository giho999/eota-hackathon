import type { TourSpot } from '@/lib/adapters';

/** §9 시간 예산: 2×도보 + 체류 ≤ 잔여 − 안전여유. 안전여유 기본 5분. */
export const SAFETY_MARGIN_MIN = 5;

export function courseTotalMin(spot: TourSpot): number {
  return 2 * spot.walkMin + spot.stayMin;
}

export interface BudgetedCourse {
  spot: TourSpot;
  totalMin: number;      // 2×도보 + 체류
  slackMin: number;      // 잔여 − 안전여유 − totalMin
  budgetMin: number;     // 잔여 − 안전여유 (예산)
}

/** 잔여시간에서 안전여유를 뺀 예산 안에 들어오는 코스만 반환. */
export function fitCourses(spots: TourSpot[], remainingMin: number): BudgetedCourse[] {
  const budgetMin = remainingMin - SAFETY_MARGIN_MIN;
  if (budgetMin <= 0) return [];
  return spots
    .map((spot) => {
      const totalMin = courseTotalMin(spot);
      return { spot, totalMin, slackMin: budgetMin - totalMin, budgetMin };
    })
    .filter((c) => c.slackMin >= 0)
    .sort((a, b) => b.spot.walkMin - a.spot.walkMin); // 가까운 것 우선
}

/** 예산 대비 소진 막대 비율 0..1 (예: 40분 중 29분 사용 → 0.725) */
export function budgetUsedRatio(course: BudgetedCourse): number {
  if (course.budgetMin <= 0) return 0;
  return Math.min(1, course.totalMin / course.budgetMin);
}
