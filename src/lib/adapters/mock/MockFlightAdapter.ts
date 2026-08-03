import type { Distribution } from '@/lib/engine';
import { PARAMS } from '@/lib/engine';
import type { FlightAdapter, FlightInfo } from '../types';

// ponytail: 고정값 mock. 실데이터(Phase 3) 전까지 데모 흐름 검증용.
export class MockFlightAdapter implements FlightAdapter {
  async lookup(flightNo: string, _date?: string): Promise<FlightInfo | null> {
    if (flightNo.toUpperCase() !== 'KE1234') return null;
    return {
      flightNo: 'KE1234',
      airline: '대한항공',
      origin: 'BKK',
      terminal: 'T1',
      scheduledArrivalMin: Math.floor(Date.now() / 60000) + 90,
      avgDelayMin: 12,
      isDomestic: false,
    };
  }

  // 유형 B mock: OZ301 출국편. 지금+3시간 출발, 마감 = 출발−40분.
  async lookupDeparture(flightNo: string, _date?: string): Promise<FlightInfo | null> {
    if (flightNo.toUpperCase() !== 'OZ301') return null;
    const departureMin = Math.floor(Date.now() / 60000) + 180;
    return {
      flightNo: 'OZ301',
      airline: '아시아나항공',
      origin: 'SFO',
      terminal: 'T1',
      scheduledArrivalMin: departureMin,
      avgDelayMin: 5,
      isDomestic: false,
      boardingDeadlineMin: departureMin - 40,
    };
  }

  async delayStats(_route: string): Promise<Distribution> {
    return PARAMS.flightDelay.default;
  }
}
