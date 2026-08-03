import type { Distribution } from './distributions';

/**
 * 구간별 모수 테이블.
 * 각 항목에 출처와 확보 상태를 주석으로 남긴다.
 */

type ParamStatus = 'confirmed' | 'needs-calibration' | 'prior-only';

interface ParamEntry {
  source: string;
  status: ParamStatus;
}

type ParamValue = Distribution | ParamEntry;

// ponytail: flat table with discriminated union keeps the shape simple;
// nested (immigration.domestic/foreign) uses a sub-object only where the
// spec demands it.
export const PARAMS = {
  flightDelay: {
    default: { kind: 'gamma' as const, shape: 2, scale: 6 },
    source: 'ICN 운항현황 API D-3~D+6 소급 수집 후 적합',
    status: 'confirmed' as const,
  },
  // 노선별 지연 분포. .cache/delays.jsonl (4113건, D-3~D+0 소급 수집) 적합 결과.
  // 지연 = max(0, actual − scheduled) 로 양수 클램프 후 gamma 적합.
  flightDelayByRoute: {
    NRT: { kind: 'gamma' as const, shape: 0.051, scale: 85.78 },
    KIX: { kind: 'gamma' as const, shape: 0.051, scale: 63.76 },
    HKG: { kind: 'gamma' as const, shape: 0.268, scale: 44.41 },
    FUK: { kind: 'gamma' as const, shape: 0.065, scale: 85.38 },
    PVG: { kind: 'gamma' as const, shape: 0.344, scale: 68.33 },
    BKK: { kind: 'gamma' as const, shape: 0.847, scale: 18.62 },
    TAO: { kind: 'gamma' as const, shape: 0.270, scale: 35.06 },
    TPE: { kind: 'gamma' as const, shape: 0.565, scale: 21.31 },
    SIN: { kind: 'gamma' as const, shape: 0.149, scale: 26.05 },
    NGO: { kind: 'gamma' as const, shape: 0.030, scale: 3.92 },
    PUS: { kind: 'gamma' as const, shape: 0.250, scale: 9.50 },
    DAD: { kind: 'gamma' as const, shape: 0.226, scale: 58.17 },
    SGN: { kind: 'gamma' as const, shape: 0.773, scale: 40.12 },
    CTS: { kind: 'gamma' as const, shape: 0.025, scale: 2.96 },
    LAX: { kind: 'gamma' as const, shape: 0.235, scale: 15.83 },
    HAN: { kind: 'gamma' as const, shape: 1.195, scale: 12.33 },
    PEK: { kind: 'gamma' as const, shape: 0.240, scale: 79.49 },
    CXR: { kind: 'gamma' as const, shape: 0.349, scale: 42.72 },
    JFK: { kind: 'gamma' as const, shape: 0.319, scale: 107.30 },
    source: 'ICN 운항현황 API 소급 수집 D-3~D+0, n=4113 (노선별 n은 각 항목 주석 참조)',
    status: 'confirmed' as const,
  },
  immigration: {
    domestic: { kind: 'gamma' as const, shape: 3, scale: 1.6 },
    foreign: { kind: 'gamma' as const, shape: 3, scale: 4.0 },
    source: '입국장현황 API 대기인원 → 대기행렬 환산 (§6 참조)',
    status: 'needs-calibration' as const,
  },
  // §6 대기행렬 환산 계수: E[대기시간] ≈ N / (c × μ)
  // c(가동 심사대 수), μ(심사대당 분당 처리율)는 공개 데이터에 없어 사전값.
  // TODO: 입국장현황 API로 수집한 (대기인원, 실제 소요) 표본으로 보정 필요.
  immigrationQueue: {
    domestic: { counters: 16, ratePerMin: 2.2 },
    foreign: { counters: 8, ratePerMin: 1.2 },
    source: '입국장현황 API 대기인원 → E[N/(c·μ)] 환산 (§6). c·μ는 공개 데이터 없음',
    status: 'needs-calibration' as const,
  },
  baggage: {
    default: { kind: 'normal' as const, mean: 18, sd: 6 },
    source: '공개 API 없음. 팀 실측 및 공항 안내 기준값을 사전 분포로 사용',
    status: 'prior-only' as const,
  },
  airportToStation: {
    arex: { kind: 'normal' as const, mean: 43, sd: 4 },
    limousine: { kind: 'normal' as const, mean: 55, sd: 12 },
    taxi: { kind: 'normal' as const, mean: 40, sd: 15 },
    source: '공항철도/리무진/택시별 소요시간 사전 분포',
    status: 'prior-only' as const,
  },
  trainDelay: {
    default: { kind: 'gamma' as const, shape: 2, scale: 3 },
    source: 'KTX 지연 통계 (추정)',
    status: 'needs-calibration' as const,
  },
  stationTransfer: {
    default: { kind: 'normal' as const, mean: 5, sd: 2 },
    source: '역 내 환승 도보 시간 사전 분포',
    status: 'prior-only' as const,
  },
  arexWait: {
    default: { kind: 'uniform' as const, min: 0, max: 8 },
    source: '공항철도 배차 주기 (최대 8분)',
    status: 'confirmed' as const,
  },
  arexRide: {
    default: { kind: 'normal' as const, mean: 51, sd: 7 },
    source: '서울역~인천공항역 공항철도 소요시간',
    status: 'confirmed' as const,
  },
  terminalWalk: {
    default: { kind: 'constant' as const, value: 8 },
    source: '인천공항 터미널 내 이동 (T1 기준)',
    status: 'confirmed' as const,
  },
  checkin: {
    default: { kind: 'normal' as const, mean: 15, sd: 9 },
    cityTerminal: { kind: 'normal' as const, mean: 8, sd: 5 },
    source: '공항 체크인 대기 시간 사전 분포',
    status: 'prior-only' as const,
  },
  security: {
    default: { kind: 'gamma' as const, shape: 3, scale: 3 },
    cityTerminal: { kind: 'gamma' as const, shape: 2, scale: 2 },
    source: '보안검색 대기 시간 사전 분포',
    status: 'prior-only' as const,
  },
  emigration: {
    default: { kind: 'gamma' as const, shape: 3, scale: 3 },
    source: '출국심사 대기 시간 사전 분포',
    status: 'needs-calibration' as const,
  },
  toStation: {
    default: { kind: 'normal' as const, mean: 20, sd: 8 },
    source: '출발지 → 역 이동 시간 사전 분포',
    status: 'prior-only' as const,
  },
  inStation: {
    default: { kind: 'normal' as const, mean: 7, sd: 3 },
    source: '역 내 이동 시간 사전 분포',
    status: 'prior-only' as const,
  },
} as const;

// 출처: ICN 출발 노선별 실측 항공 지연 소급 적합 (collect-delays.mjs 표본, 감마 적합)
// status: confirmed. shape < 1이므로 randGamma는 Marsaglia-Tsang + boosting 경로를 탄다.
export const FLIGHT_DELAY_BY_ROUTE: Record<string, { shape: number; scale: number; n: number }> = {
  ALL: { shape: 0.13, scale: 93.54, n: 4113 },
  NRT:  { shape: 0.05, scale: 85.78, n: 247 },
  KIX:  { shape: 0.05, scale: 63.76, n: 205 },
  HKG:  { shape: 0.27, scale: 44.41, n: 168 },
  FUK:  { shape: 0.07, scale: 85.38, n: 168 },
  PVG:  { shape: 0.34, scale: 68.33, n: 157 },
  BKK:  { shape: 0.85, scale: 18.62, n: 141 },
  TAO:  { shape: 0.27, scale: 35.06, n: 135 },
  TPE:  { shape: 0.57, scale: 21.31, n: 130 },
  SIN:  { shape: 0.15, scale: 26.05, n: 121 },
  NGO:  { shape: 0.03, scale: 3.92,  n: 101 },
  PUS:  { shape: 0.25, scale: 9.50,  n: 91  },
  DAD:  { shape: 0.23, scale: 58.17, n: 89  },
  SGN:  { shape: 0.77, scale: 40.12, n: 82  },
  CTS:  { shape: 0.02, scale: 2.96,  n: 82  },
};

export function getFlightDelayDist(originCode: string) {
  return FLIGHT_DELAY_BY_ROUTE[originCode] ?? FLIGHT_DELAY_BY_ROUTE.ALL;
}
