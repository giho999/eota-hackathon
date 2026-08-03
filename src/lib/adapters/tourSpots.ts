import type { TourSpot } from '@/lib/adapters/types';

// ponytail: 시연 범위는 대기 장소(서울역/광명역/대전역) 반경 한정(§9).
// mock/live 어댑터가 공유하는 역별 스팟 데이터. 좌표는 지도 마커용.
export const STATION_SPOTS: { station: string; spot: TourSpot }[] = [
  // 카페
  { station: '서울역', spot: { name: '서울역 카페거리', category: 'cafe', walkMin: 5, stayMin: 20, lat: 37.5555, lng: 126.9735 } },
  { station: '서울역', spot: { name: '명동 카페 골목', category: 'cafe', walkMin: 15, stayMin: 20, lat: 37.5636, lng: 126.9856 } },
  // 역사·문화
  { station: '서울역', spot: { name: '문화역 서울 284', category: 'history', walkMin: 8, stayMin: 20, lat: 37.5542, lng: 126.9708 } },
  { station: '서울역', spot: { name: '숭례문', category: 'history', walkMin: 12, stayMin: 15, lat: 37.5597, lng: 126.9754 } },
  // 자연·공원
  { station: '서울역', spot: { name: '서울역 광장', category: 'nature', walkMin: 4, stayMin: 10, lat: 37.5549, lng: 126.9718 } },
  { station: '서울역', spot: { name: '남산공원 순환로', category: 'nature', walkMin: 18, stayMin: 25, lat: 37.5512, lng: 126.9882 } },
  // 광명역
  { station: '광명역', spot: { name: '광명역 카페거리', category: 'cafe', walkMin: 5, stayMin: 15, lat: 37.4175, lng: 126.8850 } },
  { station: '광명역', spot: { name: '이케아 광명점', category: 'history', walkMin: 10, stayMin: 20, lat: 37.4230, lng: 126.8790 } },
  // 대전역
  { station: '대전역', spot: { name: '성심당 본점', category: 'cafe', walkMin: 7, stayMin: 15, lat: 36.3315, lng: 127.4310 } },
  { station: '대전역', spot: { name: '대전근현대사전시관', category: 'history', walkMin: 12, stayMin: 25, lat: 36.3270, lng: 127.4230 } },
];

/** 역 코드에 해당하는 스팟 (도보시간 제한 적용). 미등록 역이면 빈 배열. */
export function spotsForStation(stationCode: string, radiusWalkMin: number): TourSpot[] {
  return STATION_SPOTS.filter(
    (s) => s.station === stationCode && s.spot.walkMin <= radiusWalkMin,
  ).map((s) => s.spot);
}
