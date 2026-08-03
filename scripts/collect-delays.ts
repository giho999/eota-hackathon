#!/usr/bin/env tsx
// 이어타 — 항공기 운항현황 소급 수집 + 노선별 지연 분포 적합
//
// 사용법:
//   DATA_GO_KR_KEY=... npx tsx scripts/collect-delays.ts collect D-3 D+0
//     - 오늘 기준 D-3~D+0 (기본값) 기간의 ICN 도착편을 .cache/delays.jsonl에 append
//   DATA_GO_KR_KEY=... npx tsx scripts/collect-delays.ts --stats
//     - 기존 .cache/delays.jsonl 을 읽어 노선별 gamma 적합 결과 출력
//
// 키 없이 --stats 만 돌리면 캐시 기반으로 동작한다.

import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.resolve(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'delays.jsonl');
const BASE_URL = 'http://apis.data.go.kr/B552584/ms_ar_airport_operation_information';
const KEY = process.env.DATA_GO_KR_KEY ?? '';

// --- 공용 유틸 ---

// KEY에 URL 인코딩(%)이 포함되어 있으면 그대로, 아니면 encodeURIComponent 적용
function serviceKeyParam(key: string): string {
  return key.includes('%') ? key : encodeURIComponent(key);
}

function delayMin(actual: string, scheduled: string): number | null {
  if (!/^\d{14}$/.test(actual) || !/^\d{14}$/.test(scheduled)) return null;
  const a = Date.UTC(
    Number(actual.slice(0, 4)), Number(actual.slice(4, 6)) - 1, Number(actual.slice(6, 8)),
    Number(actual.slice(8, 10)), Number(actual.slice(10, 12)), Number(actual.slice(12, 14)),
  );
  const s = Date.UTC(
    Number(scheduled.slice(0, 4)), Number(scheduled.slice(4, 6)) - 1, Number(scheduled.slice(6, 8)),
    Number(scheduled.slice(8, 10)), Number(scheduled.slice(10, 12)), Number(scheduled.slice(12, 14)),
  );
  return Math.round((a - s) / 60000);
}

// XML 문자열에서 <tag>value</tag> 를 찾아 배열로 반환
function xmlTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

// --- collect: API 호출 + 캐시 append ---

interface RawFlight {
  flightId: string;
  airline: string;
  origin: string;
  terminal: string;
  remark: string;
  scheduled: string;
  actual: string;
  date: string;
}

async function fetchArrivals(date: string): Promise<RawFlight[]> {
  if (!KEY) throw new Error('DATA_GO_KR_KEY 필요 (collect 모드)');
  const url =
    `${BASE_URL}?serviceKey=${serviceKeyParam(KEY)}&type=xml&direction=ARR&airport=ICN` +
    `&currentDate=${date}&currentTime=0000`;
  const res = await fetch(url);
  const text = await res.text();
  if (text.includes('<resultCode>') && text.includes('ERROR') || text.includes('<errMsg>')) {
    throw new Error(`API 에러 응답: ${text.slice(0, 300)}`);
  }
  const ids = xmlTags(text, 'flightId');
  const airlines = xmlTags(text, 'airlineNm');
  const airports = xmlTags(text, 'airport');
  const terminals = xmlTags(text, 'terminal');
  const remarks = xmlTags(text, 'remark');
  const estimated = xmlTags(text, 'estimatedTime');
  const actuals = xmlTags(text, 'actualTime');
  const n = ids.length;
  const rows: RawFlight[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      flightId: ids[i] ?? '',
      airline: airlines[i] ?? '',
      origin: airports[i] ?? '',
      terminal: terminals[i] ?? '',
      remark: remarks[i] ?? '',
      scheduled: estimated[i] ?? '',
      actual: actuals[i] ?? '',
      date,
    });
  }
  return rows.filter((r) => r.flightId && r.actual && r.scheduled);
}

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

async function collect(fromOffset: number, toOffset: number) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  let appended = 0;
  for (let off = fromOffset; off <= toOffset; off++) {
    const date = isoDateOffset(off);
    const rows = await fetchArrivals(date);
    const lines = rows
      .map((r) => {
        const d = delayMin(r.actual, r.scheduled);
        if (d === null) return null;
        return {
          _k: `${r.date}${r.flightId}`,
          date: r.date,
          fid: r.flightId,
          flightId: r.flightId,
          airline: r.airline,
          origin: r.origin,
          terminal: r.terminal,
          remark: r.remark,
          scheduled: r.scheduled,
          actual: r.actual,
          delayMin: d,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    fs.appendFileSync(CACHE_FILE, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    appended += lines.length;
    console.log(`[collect] ${date} 도착편 ${lines.length}건 append (누적 ${appended})`);
  }
  console.log(`완료: ${appended}건 → ${CACHE_FILE}`);
}

// --- stats: 캐시 기반 노선별 gamma 적합 ---

interface RouteStat {
  route: string;
  n: number;
  mean: number;
  sd: number;
  shape: number;
  scale: number;
  source: string;
}

function gammaFit(delays: number[]): { shape: number; scale: number } {
  // 지연 분포는 음수 불가 → 조기 도착은 0으로 클램프 (§5.3 분포 형상은 양수 지연 기준)
  const d = delays.map((v) => Math.max(0, v));
  const n = d.length;
  const mean = d.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) return { shape: 0.5, scale: 0.5 };
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  if (sd <= 0) return { shape: 1, scale: mean };
  const shape = (mean / sd) ** 2;
  return { shape, scale: (sd * sd) / mean };
}

function formatStats(): string {
  const lines = fs
    .readFileSync(CACHE_FILE, 'utf8')
    .split('\n')
    .filter(Boolean);
  const byRoute = new Map<string, number[]>();
  for (const l of lines) {
    const r = JSON.parse(l) as { origin: string; delayMin: number };
    if (typeof r.delayMin !== 'number') continue;
    const arr = byRoute.get(r.origin) ?? [];
    arr.push(r.delayMin);
    byRoute.set(r.origin, arr);
  }
  const stats: RouteStat[] = [...byRoute.entries()]
    .map(([route, delays]) => {
      const n = delays.length;
      const fit = gammaFit(delays);
      const rawMean = delays.reduce((a, b) => a + b, 0) / n;
      const rawSd = Math.sqrt(delays.reduce((a, b) => a + (b - rawMean) ** 2, 0) / (n - 1));
      return {
        route,
        n,
        mean: rawMean,
        sd: rawSd,
        shape: fit.shape,
        scale: fit.scale,
        source: `ICN 운항현황 API 소급 수집 D-3~D+0, n=${n}`,
      };
    })
    .sort((a, b) => b.n - a.n);
  return stats
    .map((s) => {
      const line = [
        `  ${s.route}:`,
        `{ kind: 'gamma', shape: ${s.shape.toFixed(3)}, scale: ${s.scale.toFixed(2)} },`,
        `// n=${s.n}, mean=${s.mean.toFixed(1)} sd=${s.sd.toFixed(1)}`,
      ].join(' ');
      return line;
    })
    .join('\n');
}

// --- CLI ---

async function main() {
  const [mode, a, b] = process.argv.slice(2);
  if (mode === '--stats') {
    if (!fs.existsSync(CACHE_FILE)) {
      console.error('.cache/delays.jsonl 없음 — 먼저 collect 실행');
      process.exit(1);
    }
    console.log(formatStats());
    return;
  }
  const from = a ? Number(a.replace('D', '')) : -3;
  const to = b ? Number(b.replace('D', '')) : 0;
  await collect(from, to);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
