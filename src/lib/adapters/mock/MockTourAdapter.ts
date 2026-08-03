import type { TourAdapter, TourSpot } from '../types';
import { spotsForStation } from '../tourSpots';

export class MockTourAdapter implements TourAdapter {
  async nearby(stationCode: string, radiusWalkMin: number): Promise<TourSpot[]> {
    return spotsForStation(stationCode, radiusWalkMin);
  }
}
