import type { TourAdapter, TourSpot } from '../types';

// ponytail: 시연 범위는 대전역 반경 한정(§9). 좌표 기반 구조로 다른 역 확장 가능.
// walkMin은 역 좌표에서 관광지 좌표까지 도보 환산 (지금은 고정값).

// 대전역 반경 관광지. 카테고리별 2~3개씩.
const SPOTS: { station: string; spot: TourSpot }[] = [
  // 카페
  { station: '대전역', spot: { name: '성심당 본점', category: 'cafe', walkMin: 7, stayMin: 15 } },
  { station: '대전역', spot: { name: '대전역 카페거리', category: 'cafe', walkMin: 5, stayMin: 20 } },
  // 역사·문화
  { station: '대전역', spot: { name: '대전근현대사전시관', category: 'history', walkMin: 12, stayMin: 25 } },
  { station: '대전역', spot: { name: '옛 충남도청사', category: 'history', walkMin: 10, stayMin: 20 } },
  // 자연·공원
  { station: '대전역', spot: { name: '중앙로 공원', category: 'nature', walkMin: 6, stayMin: 15 } },
  { station: '대전역', spot: { name: '보문산 산책로', category: 'nature', walkMin: 15, stayMin: 30 } },
];

export class MockTourAdapter implements TourAdapter {
  async nearby(stationCode: string, radiusWalkMin: number): Promise<TourSpot[]> {
    return SPOTS.filter(
      (s) => s.station === stationCode && s.spot.walkMin <= radiusWalkMin,
    ).map((s) => s.spot);
  }
}
