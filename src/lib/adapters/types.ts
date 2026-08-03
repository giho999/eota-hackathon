import type { Distribution } from '@/lib/engine';

/** 항공편 조회 결과 (mock/live 공통 스키마) */
export interface FlightInfo {
  flightNo: string;
  airline: string;
  origin: string;             // 출발지 (예: 'BKK', 국내선이면 'GMP' 등 한국 도시)
  terminal: 'T1' | 'T2';
  scheduledArrivalMin: number; // epoch 분 단위 도착 예정 시각 (유형 B는 출발 시각)
  avgDelayMin: number;        // 평균 지연(분)
  isDomestic: boolean;
  boardingDeadlineMin?: number; // 유형 B: 탑승 마감 시각 (없으면 국제 40분/국내 20분 전)
}

/** 열차 편성 정보 */
export interface TrainOption {
  trainNo: string;
  trainType: string;          // 'KTX' | 'ITX' | ...
  from: string;
  to: string;
  departureMin: number;       // epoch 분 단위 출발 시각
  arrivalMin: number;
}

export interface FlightAdapter {
  lookup(flightNo: string, date?: string): Promise<FlightInfo | null>;
  /** 유형 B: 출국편 조회. 탑승마감시각(boardingDeadlineMin) 포함. */
  lookupDeparture?(flightNo: string, date?: string): Promise<FlightInfo | null>;
  delayStats(route: string): Promise<Distribution>;
}

export interface TrainAdapter {
  search(fromStation: string, toStation: string, afterTime: number): Promise<TrainOption[]>;
}

export interface CongestionAdapter {
  immigrationQueue(terminal: 'T1' | 'T2'): Promise<{ domestic: number; foreign: number }>;
}

/** 관광지 카테고리 (§9 관심사 질문용) */
export type TourCategory = 'cafe' | 'history' | 'nature';

/** 관광지. walkMin=역에서 도보, stayMin=머무름 시간 (§9). */
export interface TourSpot {
  name: string;
  category: TourCategory;
  walkMin: number;
  stayMin: number;
}

export interface TourAdapter {
  nearby(stationCode: string, radiusWalkMin: number): Promise<TourSpot[]>;
}
