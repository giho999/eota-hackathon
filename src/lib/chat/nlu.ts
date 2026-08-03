import type { ChatSlots, JourneyType } from './slots';

export interface NLUResult {
  slots: Partial<ChatSlots>;
}

/** LLM(키 있는 경우)용 인터페이스. 구현체는 키 존재 시 Phase 7.4에서. */
export interface NLUAdapter {
  extract(text: string): Promise<NLUResult>;
}

// ponytail: 정적 매핑(§7.4-2). 대전역 반경 시연 범위 한정.
export const STATION_MAP: Record<string, string> = {
  대전: '대전역',
  서대전: '서대전역',
  오송: '오송역',
  유성: '서대전역',
  서울: '서울역',
  광명: '광명역',
};

const FLIGHT_NO_RE = /([A-Z]{2}\d{3,4})/;

/** 규칙 기반 슬롯 추출. 키 없을 때의 폴백(§7.4). */
export class RuleNLU implements NLUAdapter {
  async extract(text: string): Promise<NLUResult> {
    const slots: Partial<ChatSlots> = {};

    const flightMatch = text.match(FLIGHT_NO_RE);
    if (flightMatch) slots.flightNo = flightMatch[1].toUpperCase();

    if (/비행기.*기차|항공.*기차|공항.*기차/.test(text)) slots.journeyType = 'A' as JourneyType;
    if (/기차.*비행기|기차.*항공|기차.*공항/.test(text)) slots.journeyType = 'B' as JourneyType;
    if (/기차만|기차만.*이동|철도만/.test(text)) slots.journeyType = 'C' as JourneyType;

    if (/위탁|부치|짐을/.test(text)) slots.checkedBaggage = true;
    if (/기내/.test(text)) slots.checkedBaggage = false;

    if (/외국|여권/.test(text)) slots.passport = 'foreign';
    if (/내국/.test(text)) slots.passport = 'domestic';

    const stationKey = Object.keys(STATION_MAP).find((k) => text.includes(k));
    if (stationKey) {
      slots.destination = stationKey;
      slots.destinationStation = STATION_MAP[stationKey];
    }

    return { slots };
  }
}
