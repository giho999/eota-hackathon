import type { TrainAdapter, TrainOption } from '../types';

// ponytail: 고정 노선 4개. 유형 A(지방행) + 유형 B(서울/광명행) 왕복.
export class MockTrainAdapter implements TrainAdapter {
  async search(fromStation: string, toStation: string, afterTime: number): Promise<TrainOption[]> {
    if (fromStation === '서울역' && toStation === '대전역') {
      return [40, 65, 90, 115, 140].map((offset, i) => ({
        trainNo: `KTX-110${i + 1}`,
        trainType: 'KTX',
        from: '서울역',
        to: '대전역',
        departureMin: afterTime + offset,
        arrivalMin: afterTime + offset + 90,
      }));
    }
    if (fromStation === '광명역' && toStation === '대전역') {
      return [25, 50, 75, 100].map((offset, i) => ({
        trainNo: `KTX-120${i + 1}`,
        trainType: 'KTX',
        from: '광명역',
        to: '대전역',
        departureMin: afterTime + offset,
        arrivalMin: afterTime + offset + 60,
      }));
    }
    // 유형 B: 지방역 → 서울역/광명역 (KTX + 공항철도 2단 환승)
    if (fromStation === '대전역' && toStation === '서울역') {
      return [30, 55, 80, 105, 130].map((offset, i) => ({
        trainNo: `KTX-130${i + 1}`,
        trainType: 'KTX',
        from: '대전역',
        to: '서울역',
        departureMin: afterTime + offset,
        arrivalMin: afterTime + offset + 50,
      }));
    }
    if (fromStation === '대전역' && toStation === '광명역') {
      return [35, 60, 85, 110].map((offset, i) => ({
        trainNo: `KTX-140${i + 1}`,
        trainType: 'KTX',
        from: '대전역',
        to: '광명역',
        departureMin: afterTime + offset,
        arrivalMin: afterTime + offset + 60,
      }));
    }
    return [];
  }
}
