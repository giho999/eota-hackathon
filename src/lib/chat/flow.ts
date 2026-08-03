import type { JourneyType, SlotName } from './slots';
import type { FlightInfo } from '@/lib/adapters';
import type { Segment } from '@/lib/engine';
import { meanOf } from '@/lib/engine';
import { PARAMS } from '@/lib/engine';

export interface CardDef {
  id: string;
  slot: SlotName | null;
}

export const CARDS_A: CardDef[] = [
  { id: 'flight', slot: 'flightNo' },
  { id: 'destination', slot: 'destination' },
  { id: 'baggage', slot: 'checkedBaggage' },
  { id: 'passport', slot: 'passport' },
  { id: 'buffer', slot: 'bufferTimeMin' },
];

export const CARDS_B: CardDef[] = [
  { id: 'flight', slot: 'flightNo' },
  { id: 'departureStation', slot: 'departureStation' },
  { id: 'cityTerminal', slot: 'cityTerminal' },
  { id: 'baggage', slot: 'checkedBaggage' },
  { id: 'passport', slot: 'passport' },
  { id: 'buffer', slot: 'bufferTimeMin' },
];

// 유형 C: 기차만. 카드 0 제외 2개 질문 (출발역·도착역, 출발 희망 시각) — §7.2
export const CARDS_C: CardDef[] = [
  { id: 'route', slot: 'route' },
  { id: 'wishTime', slot: 'wishTimeMin' },
];

/** 유형별 카드 순서. 국내선이면 여권 카드 생략(§7.3). */
export function cardsFor(type: JourneyType, isDomesticFlight?: boolean): CardDef[] {
  if (type === 'A') {
    if (isDomesticFlight) return CARDS_A.filter((c) => c.id !== 'passport');
    return CARDS_A;
  }
  if (type === 'B') {
    if (isDomesticFlight) return CARDS_B.filter((c) => c.id !== 'passport');
    return CARDS_B;
  }
  if (type === 'C') return CARDS_C;
  return [];
}

/** 유형 B 안내: 공항 도착 후 출국절차 평균(분). 열차 지연은 역 출발 기준 확정값이므로 제외하고
 *  역내 환승 + 공항철도 대기·탑승 + 터미널 이동 + (체크인) + 보안검색 + 출국심사 평균만 합산. */
export function estimateDepartureMinutes(cityTerminal: boolean, domesticFlight: boolean): number {
  return Math.round(
    buildTypeBSegments(cityTerminal, domesticFlight)
      .filter((s) => s.id !== 'trainDelay')
      .reduce((sum, s) => sum + meanOf(s.dist), 0),
  );
}

/** 공항 빠져나오는 데 걸리는 평균 시간(분) 근사. 여유 시간 질문 전 안내용.
 *  flightDelay(avgDelayMin)는 라이브 API로 baseTimeMin에 반영된 확정값이므로 제외하고,
 *  immigration + (baggage) + 공항→역 이동(공항철도 기준) 평균만 합산한다. */
export function estimateExitMinutes(flight: FlightInfo, baggageChecked: boolean): number {
  const immigration =
    flight.isDomestic || flight.origin === 'GMP'
      ? PARAMS.immigration.domestic
      : PARAMS.immigration.foreign;
  const baggage = baggageChecked ? PARAMS.baggage.default : { kind: 'constant' as const, value: 0 };
  return Math.round(
    meanOf(immigration) + meanOf(baggage) + meanOf(PARAMS.airportToStation.arex),
  );
}

/** 공항 → 역 이동 수단. §8.1 대안(이동 수단 변경) 계산에도 사용. */
export type Transport = 'arex' | 'limousine' | 'taxi';

const TRANSPORT_LABEL: Record<Transport, string> = {
  arex: '공항철도',
  limousine: '리무진',
  taxi: '택시',
};

/** 유형 A 몬테카를로 세그먼트: 지연 → 입국심사 → (수하물) → 공항→역 이동. */
export function buildTypeASegments(
  flight: FlightInfo,
  baggageChecked: boolean,
  transport: Transport,
): Segment[] {
  const isDomestic = flight.isDomestic || flight.origin === 'GMP';
  const segments: Segment[] = [
    {
      id: 'flightDelay',
      label: '실시간 지연 반영',
      dist: {
        kind: 'gamma',
        shape: 2,
        scale: Math.max(flight.avgDelayMin / 2, 1),
      },
      source: 'ICN 운항현황 API D-3~D+6 소급 수집 후 적합 (추정)',
    },
    {
      id: 'immigration',
      label: '입국 심사',
      dist: isDomestic ? PARAMS.immigration.domestic : PARAMS.immigration.foreign,
      source: PARAMS.immigration.source,
    },
  ];
  if (baggageChecked) {
    segments.push({
      id: 'baggage',
      label: '수하물 수취',
      dist: PARAMS.baggage.default,
      source: PARAMS.baggage.source,
    });
  }
  segments.push({
    id: 'airportToStation',
    label: `${TRANSPORT_LABEL[transport]} 서울역`,
    dist: PARAMS.airportToStation[transport],
    source: PARAMS.airportToStation.source,
  });
  return segments;
}

/** 유형 B: 지방역 → KTX → 서울역/광명역 → 공항철도 → 인천공항 (§4.3).
 *  역산 계산 — 열차 출발이 baseTime, 항공 탑승마감이 deadline.
 *  cityTerminal=true면 checkin 세그먼트 제외 + security 전용 통로(shape/scale 축소). */
export function buildTypeBSegments(
  cityTerminal: boolean,
  domesticFlight: boolean,
): Segment[] {
  const segments: Segment[] = [
    {
      id: 'trainDelay',
      label: '열차 지연',
      dist: PARAMS.trainDelay.default,
      source: PARAMS.trainDelay.source,
    },
    {
      id: 'stationTransfer',
      label: '역내 환승',
      dist: PARAMS.stationTransfer.default,
      source: PARAMS.stationTransfer.source,
    },
    {
      id: 'arexWait',
      label: '공항철도 대기',
      dist: PARAMS.arexWait.default,
      source: PARAMS.arexWait.source,
    },
    {
      id: 'arexRide',
      label: '공항철도 탑승',
      dist: PARAMS.arexRide.default,
      source: PARAMS.arexRide.source,
    },
    {
      id: 'terminalWalk',
      label: '터미널 이동',
      dist: PARAMS.terminalWalk.default,
      source: PARAMS.terminalWalk.source,
    },
  ];
  // 도심공항터미널에서 사전 체크인하면 공항 체크인은 소진됨 (§4.3)
  if (!cityTerminal) {
    segments.push({
      id: 'checkin',
      label: '체크인',
      dist: PARAMS.checkin.default,
      source: PARAMS.checkin.source,
    });
  }
  segments.push({
    id: 'security',
    label: cityTerminal ? '보안검색 (전용통로)' : '보안검색',
    dist: cityTerminal ? PARAMS.security.cityTerminal : PARAMS.security.default,
    source: PARAMS.security.source,
  });
  segments.push({
    id: 'emigration',
    label: '출국심사',
    dist: domesticFlight ? PARAMS.immigration.domestic : PARAMS.emigration.default,
    source: domesticFlight ? PARAMS.immigration.source : PARAMS.emigration.source,
  });
  return segments;
}

/** 유형 C: 기차만. 출발지→역 이동 + 역 내 이동 2개만 (§4.3). 수하물·여권·심사 세그먼트 생성 안 함. */
export function buildTypeCSegments(): Segment[] {
  return [
    {
      id: 'toStation',
      label: '역까지 이동',
      dist: PARAMS.toStation.default,
      source: PARAMS.toStation.source,
    },
    {
      id: 'inStation',
      label: '역 내 이동',
      dist: PARAMS.inStation.default,
      source: PARAMS.inStation.source,
    },
  ];
}
