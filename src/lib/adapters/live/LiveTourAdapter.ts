import type { TourAdapter, TourCategory, TourSpot } from '../types';
import { cachedFetch, serviceKeyParam } from './common';

// 한국관광공사 국문 관광정보 서비스 — 위치기반관광정보 (15101578)
const BASE = 'https://apis.data.go.kr/B551011/KorService1/locationBasedList1';

// 시연 범위: 대기 장소(서울역/광명역) 좌표 (§9). 다른 역은 이 맵에 좌표 추가로 확장.
const STATION_COORDS: Record<string, { mapx: number; mapy: number }> = {
  서울역: { mapx: 126.9726, mapy: 37.5547 },
  광명역: { mapx: 126.8845, mapy: 37.4166 },
  대전역: { mapx: 127.4343, mapy: 36.3323 },
  인천공항: { mapx: 126.4507, mapy: 37.4602 },
};

// 관광 API 콘텐츠타입 → 카테고리 매핑
const CONTENT_TYPE_TO_CATEGORY: Record<string, TourCategory> = {
  '39': 'cafe',      // 음식점(카페류)
  '12': 'history',   // 관광지
  '14': 'history',   // 문화시설
  '25': 'nature',    // 여행코스
  '28': 'nature',    // 레포츠
  '32': 'nature',    // 숙박
};

// 서울역 반경 mock fallback (API 불통 시에도 시연 가능)
const FALLBACK: TourSpot[] = [
  { name: '서울역 카페거리', category: 'cafe', walkMin: 5, stayMin: 20 },
  { name: '명동 카페 골목', category: 'cafe', walkMin: 15, stayMin: 20 },
  { name: '문화역 서울 284', category: 'history', walkMin: 8, stayMin: 20 },
  { name: '숭례문', category: 'history', walkMin: 12, stayMin: 15 },
  { name: '서울역 광장', category: 'nature', walkMin: 4, stayMin: 10 },
  { name: '남산공원 순환로', category: 'nature', walkMin: 18, stayMin: 25 },
];

export class LiveTourAdapter implements TourAdapter {
  constructor(private key: string) {}

  async nearby(stationCode: string, radiusWalkMin: number): Promise<TourSpot[]> {
    const coord = STATION_COORDS[stationCode];
    if (!coord) return []; // 좌표 미등록 역: 관광 없음 (§9 시연 범위)
    try {
      const radiusM = Math.max(radiusWalkMin * 80, 500); // 도보 1분 ≈ 80m
      const url =
        `${BASE}?serviceKey=${serviceKeyParam(this.key)}&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=eota` +
        `&mapX=${coord.mapx}&mapY=${coord.mapy}&radius=${radiusM}&listYN=Y&arrange=A&contentTypeId=&_type=json`;
      const text = await cachedFetch(`tour-${stationCode}-${radiusWalkMin}`, url, 60);
      const json = JSON.parse(text) as { response?: { body?: { items?: { item?: unknown[] } } } };
      const items = json?.response?.body?.items?.item ?? [];
      const spots: TourSpot[] = (items as Record<string, unknown>[])
        .map((r) => ({
          name: String(r.title ?? ''),
          category: CONTENT_TYPE_TO_CATEGORY[String(r.contenttypeid ?? '')] ?? 'history',
          walkMin: Math.max(1, Math.round((Number(r.dist) ?? 0) / 80)),
          stayMin: 20,
        }))
        .filter((s: TourSpot) => s.name && s.walkMin <= radiusWalkMin);
      return spots.length ? spots.slice(0, 6) : FALLBACK;
    } catch {
      return FALLBACK; // API 불통 → mock 폴백 (앱이 죽지 않게 §2-4)
    }
  }
}
