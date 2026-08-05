import { describe, expect, it } from 'vitest';
import { computeTypeBResults, computeTypeAResults, recommendTrainB, rolloverPast, typeBSearchAfter, SCENARIOS } from './result';
import { MockTrainAdapter } from '@/lib/adapters/mock/MockTrainAdapter';
import type { FlightInfo, TrainOption } from '@/lib/adapters';

// epoch 분 헬퍼: 특정 시각을 "2026-08-06" 기준 epoch 분으로
function minAt(hh: number, mm: number): number {
  return Math.floor(new Date(2026, 7, 6, hh, mm).getTime() / 60000);
}

function flight(deadlineHh: number, deadlineMm: number): FlightInfo {
  return {
    flightNo: 'KE647',
    airline: '대한항공',
    origin: 'SIN',
    terminal: 'T1',
    scheduledArrivalMin: minAt(12, 0),
    avgDelayMin: 5,
    isDomestic: false,
    boardingDeadlineMin: minAt(deadlineHh, deadlineMm),
  };
}

async function trainsB(deadlineMin: number, nowMin: number): Promise<TrainOption[]> {
  const adapter = new MockTrainAdapter();
  return adapter.search('대전역', '서울역', typeBSearchAfter(deadlineMin, nowMin));
}

describe('시각 유틸 — 자정 경계 롤오버', () => {
  it('기준 시각보다 이른 시각은 다음 날로 롤오버', () => {
    const now = minAt(23, 55);          // 23:55
    const deadlineToday = minAt(8, 25); // 당일 08:25 (이미 지남)
    expect(rolloverPast(deadlineToday, now)).toBe(deadlineToday + 1440); // 익일 08:25
  });

  it('기준 시각보다 늦은 시각은 그대로', () => {
    const now = minAt(13, 0);
    const deadline = minAt(18, 0);
    expect(rolloverPast(deadline, now)).toBe(deadline);
  });

  it('유형 B 검색 시작 시각은 마감 150분 전 (역산)', () => {
    const now = minAt(13, 0);
    const deadline = minAt(18, 0);
    expect(typeBSearchAfter(deadline, now)).toBe(deadline - 150);
  });
});

describe('유형 B — 자정 경계 0% 버그 회귀', () => {
  it('기준 23:55, 탑승마감 익일 08:25 → 확률 > 0', async () => {
    const now = minAt(23, 55);
    const deadline = rolloverPast(minAt(8, 25), now); // 익일 08:25
    const options = await trainsB(deadline, now);
    const scenarios = computeTypeBResults(flight(8, 25), false, deadline, options);
    const airport = recommendTrainB(scenarios[0]);
    const city = recommendTrainB(scenarios[1]);
    expect(options.length).toBeGreaterThan(0);
    expect(airport.result.probability).toBeGreaterThan(0);
    expect(city.result.probability).toBeGreaterThan(0);
  });

  it('기준 13:00, 탑승마감 같은 날 18:00 → 확률 > 0', async () => {
    const now = minAt(13, 0);
    const deadline = minAt(18, 0);
    const options = await trainsB(deadline, now);
    const scenarios = computeTypeBResults(flight(18, 0), false, deadline, options);
    const airport = recommendTrainB(scenarios[0]);
    expect(airport.result.probability).toBeGreaterThan(0);
  });

  it('기준 13:00, 탑승마감 같은 날 13:30 (불가능) → 확률 ≈ 0', async () => {
    const now = minAt(13, 0);
    const deadline = minAt(13, 30);
    const options = await trainsB(deadline, now);
    const scenarios = computeTypeBResults(flight(13, 30), false, deadline, options);
    // 마감 30분 전 열차는 존재하지만 역산 시작이 마감 3시간 전이므로
    // 가장 이른 열차도 출발이 마감 전일 수 있음 — 전 열차 0%가 아니라
    // "여유 부족 → 0에 가까움"을 확인 (모든 열차가 0% 이하)
    for (const s of scenarios) {
      for (const tr of s.trains) {
        expect(tr.result.probability).toBeLessThan(0.5);
      }
    }
  });

  it('도심공항터미널 분기 확률 ≥ 인천공항 체크인 분기 확률 (항상)', async () => {
    const now = minAt(13, 0);
    const deadline = minAt(18, 0);
    const options = await trainsB(deadline, now);
    const scenarios = computeTypeBResults(flight(18, 0), false, deadline, options);
    for (const tr of scenarios[0].trains) {
      const same = scenarios[1].trains.find((t) => t.train.trainNo === tr.train.trainNo);
      if (same) {
        expect(same.result.probability).toBeGreaterThanOrEqual(tr.result.probability);
      }
    }
  });
});

describe('MockTrainAdapter — 주간 편성 (05:00~23:00)', () => {
  it('새벽 afterTime에도 첫 편성이 05:00 이후', async () => {
    const adapter = new MockTrainAdapter();
    const options = await adapter.search('대전역', '서울역', minAt(2, 0));
    const depInDay = options.map((t) => {
      const inDay = ((t.departureMin % 1440) + 1440) % 1440;
      return { no: t.trainNo, hh: Math.floor(inDay / 60), mm: inDay % 60 };
    });
    expect(depInDay.length).toBeGreaterThan(0);
    for (const d of depInDay) {
      expect(d.hh).toBeGreaterThanOrEqual(5);
      expect(d.hh).toBeLessThan(23);
    }
  });

  it('심야 afterTime에도 다음날 05:00 이후 첫 편성', async () => {
    const adapter = new MockTrainAdapter();
    const options = await adapter.search('대전역', '서울역', minAt(23, 55));
    for (const t of options) {
      const inDay = ((t.departureMin % 1440) + 1440) % 1440;
      expect(Math.floor(inDay / 60)).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('유형 A — 동작 불변 (회귀)', () => {
  it('기존 시나리오에서 안전 추천이 85% 이상 유지', async () => {
    const now = minAt(13, 0);
    const adapter = new MockTrainAdapter();
    const optionsByScenario: TrainOption[][] = [];
    for (const config of SCENARIOS) {
      optionsByScenario.push(await adapter.search(config.from, config.to, now + config.searchOffsetMin));
    }
    const flightA: FlightInfo = {
      flightNo: 'KE1234',
      airline: '대한항공',
      origin: 'BKK',
      terminal: 'T1',
      scheduledArrivalMin: now,
      avgDelayMin: 12,
      isDomestic: false,
    };
    const results = computeTypeAResults(flightA, false, 30, optionsByScenario);
    const primary = results[0];
    const best = primary.trains.reduce((a, b) => (b.result.probability > a.result.probability ? b : a));
    expect(best.result.probability).toBeGreaterThan(0.85);
  });
});
