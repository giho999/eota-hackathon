import type { FlightInfo, TrainOption } from '@/lib/adapters';
import { simulate, type SimulationResult } from '@/lib/engine';
import { buildTypeASegments, buildTypeBSegments, buildTypeCSegments, type Transport } from './flow';

export interface ScenarioConfig {
  id: string;
  label: string;
  transport: Transport;
  from: string;
  to: string;
  searchOffsetMin: number;
}

export interface TrainResult {
  train: TrainOption;
  result: SimulationResult;
}

export interface ScenarioResult {
  config: ScenarioConfig;
  trains: TrainResult[];
}

/** §8.1 대안 계산용 시나리오. 기본(공항철도·서울역) + 이동수단/경유역 변경. */
export const SCENARIOS: ScenarioConfig[] = [
  { id: 'primary', label: '공항철도 · 서울역 경유', transport: 'arex', from: '서울역', to: '대전역', searchOffsetMin: 60 },
  { id: 'transport', label: '이동 수단 변경 (택시)', transport: 'taxi', from: '서울역', to: '대전역', searchOffsetMin: 60 },
  { id: 'station', label: '경유역 변경 (광명역)', transport: 'taxi', from: '광명역', to: '대전역', searchOffsetMin: 45 },
];

// 열차 목록은 클라이언트에서 /api/train 프록시로 조회해 주입받는다 (서버 전용 어댑터 분리).
export function computeTypeAResults(
  flight: FlightInfo,
  baggageChecked: boolean,
  bufferTimeMin: number,
  optionsByScenario: TrainOption[][],
): ScenarioResult[] {
  return SCENARIOS.map((config, i) => {
    const segments = buildTypeASegments(flight, baggageChecked, config.transport);
    const options = optionsByScenario[i] ?? [];
    return {
      config,
      trains: options.map((t) => ({
        train: t,
        result: simulate({
          segments,
          baseTimeMin: flight.scheduledArrivalMin,
          deadlineMin: t.departureMin - bufferTimeMin,
          iterations: 10000,
          seed: t.departureMin,
        }),
      })),
    };
  });
}

export function bestTrain(scenario: ScenarioResult): TrainResult {
  return scenario.trains.reduce((a, b) =>
    b.result.probability > a.result.probability ? b : a,
  );
}

/** 유형 A 안전 추천: 확률 임계값(기본 90%) 이상을 만족하는 가장 이른 출발 열차.
 *  만족하는 열차가 없으면 null (UI에서 안전 추천 카드를 생략). (유형 B '가장 늦은 열차' 규칙은 Phase 4) */
export function recommendTrain(scenario: ScenarioResult, threshold = 0.9): TrainResult | null {
  const qualified = scenario.trains.filter((t) => t.result.probability >= threshold);
  if (qualified.length === 0) return null;
  return qualified.reduce((a, b) =>
    b.train.departureMin < a.train.departureMin ? b : a,
  );
}

/** 타이트 선택: 확률과 무관하게 가장 이른 출발 열차. 확률은 그대로 노출. */
export function tightestTrain(scenario: ScenarioResult): TrainResult {
  return scenario.trains.reduce((a, b) =>
    b.train.departureMin < a.train.departureMin ? b : a,
  );
}

// ── 유형 B (기차 → 비행기): 역산 계산 ──

export interface TypeBConfig {
  id: string;
  label: string;      // '인천공항에서 체크인' | '광명역 사전 체크인'
  cityTerminal: boolean;
}

/** §4.3 도심공항터미널 분기: 같은 열차를 두 경우로 계산해 비교. */
export const TYPE_B_CASES: TypeBConfig[] = [
  { id: 'airport', label: '인천공항에서 체크인', cityTerminal: false },
  { id: 'cityTerminal', label: '도심공항터미널 사전 체크인', cityTerminal: true },
];

export interface TypeBScenario {
  config: TypeBConfig;
  trains: TrainResult[];  // 각 열차: 열차 출발 → 탑승마감까지 확률
}

/** 역산: baseTime=열차 출발, deadline=탑승마감. 각 열차의 성공 확률 계산. */
export function computeTypeBResults(
  flight: FlightInfo,
  domesticFlight: boolean,
  deadlineMin: number,
  trainOptions: TrainOption[],
): TypeBScenario[] {
  return TYPE_B_CASES.map((config) => ({
    config,
    trains: trainOptions.map((t) => ({
      train: t,
      result: simulate({
        segments: buildTypeBSegments(config.cityTerminal, domesticFlight),
        baseTimeMin: t.departureMin,
        deadlineMin,
        iterations: 10000,
        seed: t.departureMin,
      }),
    })),
  }));
}

/** 유형 B 추천: 확률 임계값(기본 90%) 이상을 만족하는 가장 늦은 출발 열차.
 *  만족하는 열차가 없으면 최대 확률 열차로 폴백. (유형 A '가장 이른 열차'와 반대) */
export function recommendTrainB(scenario: TypeBScenario, threshold = 0.9): TrainResult {
  const qualified = scenario.trains.filter((t) => t.result.probability >= threshold);
  if (qualified.length === 0) {
    return scenario.trains.reduce((a, b) =>
      b.result.probability > a.result.probability ? b : a,
    );
  }
  return qualified.reduce((a, b) =>
    b.train.departureMin > a.train.departureMin ? b : a,
  );
}

// ── 유형 C (기차만): 출발지→역→역내 이동 후 열차 탑승 ──

export interface TypeCScenario {
  trains: TrainResult[];  // 각 열차: 지금부터 toStation+inStation이 열차 출발 전에 끝날 확률
}

/** baseTime=현재, deadline=열차 출발. toStation+inStation이 출발 전에 끝나는지 계산. */
export function computeTypeCResults(
  nowMin: number,
  trainOptions: TrainOption[],
): TypeCScenario {
  const segments = buildTypeCSegments();
  return {
    trains: trainOptions.map((t) => ({
      train: t,
      result: simulate({
        segments,
        baseTimeMin: nowMin,
        deadlineMin: t.departureMin,
        iterations: 10000,
        seed: t.departureMin,
      }),
    })),
  };
}

/** 유형 C 추천: 유형 A와 동일 — 확률 임계값(기본 90%) 이상을 만족하는 가장 이른 출발 열차. */
export function recommendTrainC(scenario: TypeCScenario, threshold = 0.9): TrainResult | null {
  const qualified = scenario.trains.filter((t) => t.result.probability >= threshold);
  if (qualified.length === 0) return null;
  return qualified.reduce((a, b) =>
    b.train.departureMin < a.train.departureMin ? b : a,
  );
}
