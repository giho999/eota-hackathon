import { PARAMS } from '@/lib/engine';
import type { CongestionAdapter } from '../types';
import { cachedFetch, serviceKeyParam, xmlTags } from './common';

const BASE_URL = 'http://apis.data.go.kr/B552584/ms_ar_immigration_waittime';

interface QueueCounts {
  domestic: number;
  foreign: number;
}

// 입국장현황 API: 대기인원(명)만 제공. 분 단위 시간은 §6 공식으로 환산한다.
// E[대기시간] ≈ N / (c × μ) — c, μ는 params.ts immigrationQueue 사전값.
export class LiveCongestionAdapter implements CongestionAdapter {
  constructor(private key: string) {}

  async immigrationQueue(terminal: 'T1' | 'T2'): Promise<QueueCounts> {
    const url =
      `${BASE_URL}?serviceKey=${serviceKeyParam(this.key)}&type=xml&airport=ICN` +
      `&terminal=${terminal === 'T2' ? 'P02' : 'P01'}`;
    const text = await cachedFetch(`immigration-${terminal}`, url, 5);
    const values = xmlTags(text, 'waitingPeople').map(Number);
    const korean = values[0] ?? 0;
    const foreign = values[1] ?? 0;
    // TODO: §6 환산 계수 보정 — (대기인원, 실제 소요) 표본 수집 후 params 갱신
    return { domestic: korean, foreign };
  }
}

// 대기인원 → 예상 대기시간(분) 환산 (§6). params.ts의 사전값 사용.
export function queueToWaitMin(count: number, kind: 'domestic' | 'foreign'): number {
  const p = kind === 'domestic' ? PARAMS.immigrationQueue.domestic : PARAMS.immigrationQueue.foreign;
  return count / (p.counters * p.ratePerMin);
}
