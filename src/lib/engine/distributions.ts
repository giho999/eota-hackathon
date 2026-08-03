export type Distribution =
  | { kind: 'gamma';    shape: number; scale: number }
  | { kind: 'normal';   mean: number;  sd: number }
  | { kind: 'uniform';  min: number;   max: number }
  | { kind: 'constant'; value: number };

/**
 * Mulberry32 PRNG
 */
export function createRNG(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform for Normal distribution
 */
function sampleNormal(mean: number, sd: number, rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * sd + mean;
}

/**
 * Marsaglia-Tsang method for Gamma distribution
 */
function sampleGamma(shape: number, scale: number, rng: () => number): number {
  if (shape < 1) {
    return sampleGamma(shape + 1, scale, rng) * Math.pow(rng(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v, u;
    do {
      x = sampleNormal(0, 1, rng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    u = rng();

    if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

export function sample(dist: Distribution, rng: () => number): number {
  switch (dist.kind) {
    case 'constant':
      return dist.value;
    case 'uniform':
      return rng() * (dist.max - dist.min) + dist.min;
    case 'normal':
      return sampleNormal(dist.mean, dist.sd, rng);
    case 'gamma':
      return sampleGamma(dist.shape, dist.scale, rng);
  }
}

export function meanOf(dist: Distribution): number {
  switch (dist.kind) {
    case 'constant':
      return dist.value;
    case 'uniform':
      return (dist.min + dist.max) / 2;
    case 'normal':
      return dist.mean;
    case 'gamma':
      return dist.shape * dist.scale;
  }
}
