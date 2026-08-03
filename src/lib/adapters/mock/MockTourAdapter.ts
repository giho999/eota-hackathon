import type { TourAdapter, TourSpot } from '../types';

// ponytail: 시연 범위는 서울역 반경 한정(§9). 좌표 기반 구조로 다른 역 확장 가능.
// 관광 반경은 "대기 장소" = 추천 열차 승차역 기준 (유형 A: 인천→서울역→대전에서 대기는 서울역).

// 서울역 반경 관광지 + 광명역(경유역 변경 대안). 카테고리별 2~3개씩.
const SPOTS: { station: string; spot: TourSpot }[] = [
  // 카페
  { station: '서울역', spot: { name: '서울역 카페거리', category: 'cafe', walkMin: 5, stayMin: 20 } },
  { station: '서울역', spot: { name: '명동 카페 골목', category: 'cafe', walkMin: 15, stayMin: 20 } },
  // 역사·문화
  { station: '서울역', spot: { name: '문화역 서울 284', category: 'history', walkMin: 8, stayMin: 20 } },
  { station: '서울역', spot: { name: '숭례문', category: 'history', walkMin: 12, stayMin: 15 } },
  // 자연·공원
  { station: '서울역', spot: { name: '서울역 광장', category: 'nature', walkMin: 4, stayMin: 10 } },
  { station: '서울역', spot: { name: '남산공원 순환로', category: 'nature', walkMin: 18, stayMin: 25 } },
  // 광명역 (경유역 변경 시나리오용)
  { station: '광명역', spot: { name: '광명역 카페거리', category: 'cafe', walkMin: 5, stayMin: 15 } },
  { station: '광명역', spot: { name: '이케아 광명점', category: 'history', walkMin: 10, stayMin: 20 } },
  // 대전역 (유형 C 출발역 시나리오용)
  { station: '대전역', spot: { name: '성심당 본점', category: 'cafe', walkMin: 7, stayMin: 15 } },
  { station: '대전역', spot: { name: '대전근현대사전시관', category: 'history', walkMin: 12, stayMin: 25 } },
];

export class MockTourAdapter implements TourAdapter {
  async nearby(stationCode: string, radiusWalkMin: number): Promise<TourSpot[]> {
    return SPOTS.filter(
      (s) => s.station === stationCode && s.spot.walkMin <= radiusWalkMin,
    ).map((s) => s.spot);
  }
}
