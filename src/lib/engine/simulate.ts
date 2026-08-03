import { Distribution, createRNG, sample, meanOf } from './distributions';

export interface Segment {
  id: string;
  label: string;
  dist: Distribution;
  source: string;
}

export interface SimulationInput {
  segments: Segment[];
  baseTimeMin: number;
  deadlineMin: number;
  iterations?: number;
  seed?: number;
}

export interface SimulationResult {
  probability: number;
  percentiles: { p50: number; p80: number; p95: number };
  histogram: { binStart: number; binEnd: number; count: number }[];
  timeline: {
    id: string;
    label: string;
    meanMinutes: number;
    cumulativeMin: number;
  }[];
}

export function simulate(input: SimulationInput): SimulationResult {
  const { segments, baseTimeMin, deadlineMin, iterations = 10000, seed } = input;
  const rng = seed !== undefined ? createRNG(seed) : Math.random;

  const arrivalTimes: number[] = [];
  let successes = 0;

  for (let i = 0; i < iterations; i++) {
    let currentTime = baseTimeMin;
    for (const segment of segments) {
      currentTime += sample(segment.dist, rng);
    }
    arrivalTimes.push(currentTime);
    if (currentTime <= deadlineMin) {
      successes++;
    }
  }

  arrivalTimes.sort((a, b) => a - b);

  const getPercentile = (p: number) => arrivalTimes[Math.floor((p / 100) * (iterations - 1))];

  // Histogram
  const min = arrivalTimes[0];
  const max = arrivalTimes[iterations - 1];
  const binCount = 20;
  const histogram: { binStart: number; binEnd: number; count: number }[] = [];

  if (max === min) {
    histogram.push({ binStart: min, binEnd: min + 1, count: iterations });
  } else {
    const binSize = (max - min) / binCount;
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      histogram.push({ binStart, binEnd, count: 0 });
    }

    for (const time of arrivalTimes) {
      let binIndex = Math.floor((time - min) / binSize);
      if (binIndex >= binCount) binIndex = binCount - 1;
      histogram[binIndex].count++;
    }
  }

  // Timeline
  let cumulativeMin = baseTimeMin;
  const timeline = segments.map((s) => {
    const mean = meanOf(s.dist);
    cumulativeMin += mean;
    return {
      id: s.id,
      label: s.label,
      meanMinutes: mean,
      cumulativeMin,
    };
  });

  return {
    probability: successes / iterations,
    percentiles: {
      p50: getPercentile(50),
      p80: getPercentile(80),
      p95: getPercentile(95),
    },
    histogram,
    timeline,
  };
}
