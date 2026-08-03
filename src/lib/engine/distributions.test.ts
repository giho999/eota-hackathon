import { describe, it, expect } from 'vitest';
import { createRNG, sample, type Distribution } from './distributions';

// Erlang 근사(shape번 지수 합산)는 shape < 1에서 루프가 사실상 한 번만 돌아
// Exp(scale)로 퇴화한다. Marsaglia-Tsang + boosting 트릭이 0 < shape < 1에서도
// 평균 = shape*scale, 분산 = shape*scale^2 을 유지하는지 검증한다.
// createRNG는 시드 고정 시 결정론적이므로 같은 시드면 항상 같은 결과가 나온다.

function empiricalMeanVariance(dist: Distribution, n: number, seed: number) {
  const rng = createRNG(seed);
  const samples = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = sample(dist, rng);
    samples[i] = v;
    sum += v;
  }
  const mean = sum / n;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = samples[i] - mean;
    ss += d * d;
  }
  return { mean, variance: ss / (n - 1) };
}

const relErr = (got: number, want: number) => Math.abs(got - want) / want;

describe('sample gamma with 0 < shape < 1', () => {
  // 실측 적합 결과의 대표값: 최저 shape(CTS 0.02), ALL(0.13), 최고 shape(BKK 0.85)
  const cases = [
    {
      shape: 0.02,
      scale: 2.96,
      seed: 4,
      meanTol: 0.01,
      // ponytail: excess kurtosis ≈ 6e4 (승수 U^50) 때문에 표본분산의 상대 SE가
      // 100k 표본에서 ~77%라 1% 밴드는 통계적으로 불가능(6e8 표본 필요).
      // 50% 밴드도 Erlang 퇴화 버그(분산 = scale² = 8.76 vs 기대 0.175, ~4900% 오차)는 잡는다.
      varTol: 0.5,
    },
    { shape: 0.13, scale: 93.54, seed: 2, meanTol: 0.01, varTol: 0.01 },
    { shape: 0.85, scale: 18.62, seed: 2, meanTol: 0.01, varTol: 0.01 },
  ];

  for (const { shape, scale, seed, meanTol, varTol } of cases) {
    it(`shape=${shape} -> mean ≈ shape*scale, variance ≈ shape*scale^2 within tolerance`, () => {
      const { mean, variance } = empiricalMeanVariance({ kind: 'gamma', shape, scale }, 100_000, seed);
      expect(relErr(mean, shape * scale)).toBeLessThan(meanTol);
      expect(relErr(variance, shape * scale * scale)).toBeLessThan(varTol);
    });
  }

  // Phase 3 회귀 테스트: shape=0.3, scale=10, 10만 샘플, 평균이 이론값의 10% 이내.
  // Erlang 합산 방식이면 평균이 scale(=10)으로 퇴화해 이 테스트가 실패한다.
  it('shape=0.3 scale=10 -> mean converges to shape*scale within 10%', () => {
    const { mean } = empiricalMeanVariance({ kind: 'gamma', shape: 0.3, scale: 10 }, 100_000, 2026);
    expect(mean).toBeGreaterThan(2.7);
    expect(mean).toBeLessThan(3.3);
  });
});
