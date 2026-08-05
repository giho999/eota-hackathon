import type { TrainAdapter, TrainOption } from '../types';

// ponytail: 고정 노선 4개. 유형 A(지방행) + 유형 B(서울/광명행) 왕복.
// afterTime(epoch 분)은 "이 시각 이후 첫 편성" 기준. KTX 실제 운행 시간대(05:00~23:00)를
// 벗어나면 당일 첫차(05:00) 또는 다음날 첫차로 보정한다 — 새벽 01:35 같은 실재하지 않는 편성 방지.
const MIN_PER_DAY = 1440;
const DAY_START = 5 * 60;   // 05:00
const DAY_END = 23 * 60;    // 23:00

/** afterTime 이후의 첫 주간(05:00~23:00) 기준 시각(epoch 분)을 계산.
 *  - afterTime이 05:00 이전(새벽)이면 당일 05:00
 *  - afterTime이 23:00 이후(심야)이면 다음날 05:00
 *  - 그 외에는 afterTime 그대로 */
function daytimeBase(afterTime: number): number {
  const inDay = ((afterTime % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const dayStart = afterTime - inDay;
  if (inDay < DAY_START) return dayStart + DAY_START;
  if (inDay >= DAY_END) return dayStart + MIN_PER_DAY + DAY_START;
  return afterTime;
}

interface RouteSpec {
  offsets: number[];
  duration: number;
  trainNo: (i: number) => string;
}

const ROUTES: Record<string, Record<string, RouteSpec>> = {
  '서울역': {
    '대전역': {
      offsets: [40, 65, 90, 115, 140],
      duration: 90,
      trainNo: (i) => `KTX-110${i + 1}`,
    },
  },
  '광명역': {
    '대전역': {
      offsets: [25, 50, 75, 100],
      duration: 60,
      trainNo: (i) => `KTX-120${i + 1}`,
    },
  },
  '대전역': {
    '서울역': {
      offsets: [30, 55, 80, 105, 130],
      duration: 50,
      trainNo: (i) => `KTX-130${i + 1}`,
    },
    '광명역': {
      offsets: [35, 60, 85, 110],
      duration: 60,
      trainNo: (i) => `KTX-140${i + 1}`,
    },
  },
};

export class MockTrainAdapter implements TrainAdapter {
  async search(fromStation: string, toStation: string, afterTime: number): Promise<TrainOption[]> {
    const spec = ROUTES[fromStation]?.[toStation];
    if (!spec) return [];
    const base = daytimeBase(afterTime);
    return spec.offsets.map((offset, i) => {
      const departureMin = base + offset;
      // 23:00을 넘는 편성은 잘라낸다 (실제 KTX는 그 시간대에 없음)
      const depInDay = ((departureMin % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
      if (depInDay >= DAY_END) return null;
      return {
        trainNo: spec.trainNo(i),
        trainType: 'KTX',
        from: fromStation,
        to: toStation,
        departureMin,
        arrivalMin: departureMin + spec.duration,
      };
    }).filter((t): t is TrainOption => t !== null);
  }
}
