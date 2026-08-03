import type { CongestionAdapter } from '../types';

// ponytail: 고정값. Phase 3에서 실 API로 대체.
export class MockCongestionAdapter implements CongestionAdapter {
  async immigrationQueue(_terminal: 'T1' | 'T2'): Promise<{ domestic: number; foreign: number }> {
    return { domestic: 120, foreign: 80 };
  }
}
