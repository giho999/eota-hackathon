export type JourneyType = 'A' | 'B' | 'C';

export interface ChatSlots {
  journeyType: JourneyType | null;
  flightNo: string | null;
  destination: string | null;
  destinationStation: string | null;
  departureStation: string | null;   // 유형 B: 출발역 (예: 대전역)
  cityTerminal: boolean | null;      // 유형 B: 도심공항터미널 사전 체크인 여부
  route: { from: string; to: string } | null;  // 유형 C: 출발역·도착역
  wishTimeMin: number | null;        // 유형 C: 출발 희망 시각 (epoch 분)
  checkedBaggage: boolean | null;
  passport: 'domestic' | 'foreign' | null;
  bufferTimeMin: number | null;
}

export const EMPTY_SLOTS: ChatSlots = {
  journeyType: null,
  flightNo: null,
  destination: null,
  destinationStation: null,
  departureStation: null,
  cityTerminal: null,
  route: null,
  wishTimeMin: null,
  checkedBaggage: null,
  passport: null,
  bufferTimeMin: null,
};

export type SlotName = keyof ChatSlots;

export const SLOT_ORDER_A: SlotName[] = [
  'flightNo',
  'destination',
  'checkedBaggage',
  'passport',
  'bufferTimeMin',
];

export const SLOT_ORDER_B: SlotName[] = [
  'flightNo',
  'departureStation',
  'cityTerminal',
  'checkedBaggage',
  'passport',
  'bufferTimeMin',
];

export const SLOT_ORDER_C: SlotName[] = ['route', 'wishTimeMin'];

const FLIGHT_NO_RE = /^[A-Z]{2}\d{3,4}$/;

export function validateSlot(name: SlotName, value: unknown): string | null {
  switch (name) {
    case 'flightNo':
      return typeof value === 'string' && FLIGHT_NO_RE.test(value.toUpperCase())
        ? null
        : '항공편명 형식이 올바르지 않아요 (예: KE1234)';
    case 'checkedBaggage':
      return typeof value === 'boolean' ? null : '올바른 값을 선택해 주세요';
    case 'passport':
      return value === 'domestic' || value === 'foreign' ? null : '올바른 값을 선택해 주세요';
    case 'cityTerminal':
      return typeof value === 'boolean' ? null : '올바른 값을 선택해 주세요';
    case 'route':
      return value && typeof value === 'object' && 'from' in (value as object) && 'to' in (value as object)
        ? null
        : '출발역과 도착역을 선택해 주세요';
    case 'wishTimeMin':
      return typeof value === 'number' ? null : '희망 시각을 선택해 주세요';
    case 'bufferTimeMin':
      return typeof value === 'number' ? null : '여유 시간을 선택해 주세요';
    default:
      return null;
  }
}
