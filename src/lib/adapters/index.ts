import type { FlightAdapter, TrainAdapter, CongestionAdapter, TourAdapter } from './types';
import { MockFlightAdapter } from './mock/MockFlightAdapter';
import { MockTrainAdapter } from './mock/MockTrainAdapter';
import { MockCongestionAdapter } from './mock/MockCongestionAdapter';
import { MockTourAdapter } from './mock/MockTourAdapter';
import { LiveFlightAdapter } from './live/LiveFlightAdapter';
import { LiveCongestionAdapter } from './live/LiveCongestionAdapter';
import { LiveTourAdapter } from './live/LiveTourAdapter';

export * from './types';

// ponytail: 키 없으면 mock. 키 있으면 live(항공·혼잡도·관광). 열차는 Phase 3에서 보류 → 항상 mock.
const key = process.env.DATA_GO_KR_KEY ?? '';
const useLive = Boolean(key);

export const flight: FlightAdapter = useLive ? new LiveFlightAdapter(key) : new MockFlightAdapter();
export const train: TrainAdapter = new MockTrainAdapter();
export const congestion: CongestionAdapter = useLive ? new LiveCongestionAdapter(key) : new MockCongestionAdapter();
export const tour: TourAdapter = useLive ? new LiveTourAdapter(key) : new MockTourAdapter();
