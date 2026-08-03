import type { Distribution } from '@/lib/engine';
import { PARAMS } from '@/lib/engine';
import type { FlightAdapter, FlightInfo } from '../types';
import { CACHE_DIR_EXPORT, mkdir, read, rawFetch, write } from './common';
import { join } from 'path';

// collect-delays.mjs가 검증한 엔드포인트 (여객기 운항 현황 상세 조회 서비스)
const BASE = 'https://apis.data.go.kr/B551177/StatusOfPassengerFlightsDeOdp';
const OP_ARR = '/getPassengerArrivalsDeOdp';
const OP_DEP = '/getPassengerDeparturesDeOdp';
const PAGE_SIZE = 1000;

interface RawArrival {
  fid: string;
  flightId: string;
  airline: string;
  airportCode: string;
  terminalid: string;
  remark: string;
  scheduleDateTime: string;
  estimatedDateTime: string;
}

// collect-delays.mjs의 call() 로직 재사용: 키 인코딩 자동 감지, XML 에러 감지
function buildUrl(key: string, op: string, params: Record<string, string>): string {
  const qs = new URLSearchParams({ type: 'json', numOfRows: String(PAGE_SIZE), ...params });
  const keyPart = key.includes('%') ? key : encodeURIComponent(key);
  return `${BASE}${op}?serviceKey=${keyPart}&${qs}`;
}

interface RawDeparture {
  fid: string;
  flightId: string;
  airline: string;
  airportCode: string;
  terminalid: string;
  scheduleDateTime: string;    // 출발 예정
  estimatedDateTime: string;   // 실제 출발
}

function extractDeparture(r: Record<string, unknown>): RawDeparture | null {
  const raw = {
    fid: String(r.fid ?? ''),
    flightId: String(r.flightId ?? ''),
    airline: String(r.airline ?? ''),
    airportCode: String(r.airportCode ?? ''),
    terminalid: String(r.terminalid ?? ''),
    scheduleDateTime: String(r.scheduleDateTime ?? ''),
    estimatedDateTime: String(r.estimatedDateTime ?? ''),
  };
  if (!raw.flightId || !raw.scheduleDateTime || !raw.estimatedDateTime) return null;
  return raw;
}

function extract(r: Record<string, unknown>): RawArrival | null {
  const raw = {
    fid: String(r.fid ?? ''),
    flightId: String(r.flightId ?? ''),
    airline: String(r.airline ?? ''),
    airportCode: String(r.airportCode ?? ''),
    terminalid: String(r.terminalid ?? ''),
    remark: String(r.remark ?? ''),
    scheduleDateTime: String(r.scheduleDateTime ?? ''),
    estimatedDateTime: String(r.estimatedDateTime ?? ''),
  };
  // 이 서비스는 인천공항 도착편 전용 — remark가 '도착'이 아닌 레코드는 제외
  if (raw.remark !== '도착' || !raw.flightId || !raw.scheduleDateTime || !raw.estimatedDateTime) {
    return null;
  }
  return raw;
}

// 이 API의 scheduleDateTime/estimatedDateTime은 yyyyMMddHHmm (12자리)
function delayMin(actual: string, scheduled: string): number | null {
  if (!/^\d{12}$/.test(actual) || !/^\d{12}$/.test(scheduled)) return null;
  const a = Date.UTC(
    Number(actual.slice(0, 4)), Number(actual.slice(4, 6)) - 1, Number(actual.slice(6, 8)),
    Number(actual.slice(8, 10)), Number(actual.slice(10, 12)),
  );
  const s = Date.UTC(
    Number(scheduled.slice(0, 4)), Number(scheduled.slice(4, 6)) - 1, Number(scheduled.slice(6, 8)),
    Number(scheduled.slice(8, 10)), Number(scheduled.slice(10, 12)),
  );
  return Math.round((a - s) / 60000);
}

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// 하루 전체 도착편 목록을 페이지네이션으로 수집. 전체 목록을 flights-{date}.json에 캐시.
// 같은 날 여러 항공편을 조회해도 API를 반복 호출하지 않는다 (TTL 12시간).
async function fetchArrivalsByDate(key: string, date: string): Promise<RawArrival[]> {
  const cacheFile = join(CACHE_DIR_EXPORT, `flights-${date}.json`);
  try {
    const cached = JSON.parse(await read(cacheFile)) as { ts: number; body: RawArrival[] };
    if (Date.now() - cached.ts < 12 * 3600000 && cached.body.length > 0) return cached.body;
  } catch {
    // 캐시 없음/손상/권한 → 라이브 호출 (Vercel 휘발성 /tmp 감안)
  }
  const out: RawArrival[] = [];
  let page = 1;
  for (;;) {
    const url = buildUrl(key, OP_ARR, { searchday: date, from_time: '0000', to_time: '2400', pageNo: String(page) });
    const text = await rawFetch(url);
    let json: { response?: { body?: { items?: unknown } } };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`JSON 파싱 실패 (${date} p${page}): ${text.slice(0, 300)}`);
    }
    const items = json?.response?.body?.items as unknown;
    const list = Array.isArray(items)
      ? (items as Record<string, unknown>[])
      : items
        ? [items as Record<string, unknown>]
        : [];
    if (list.length === 0) break;
    for (const r of list) {
      const rec = extract(r);
      if (rec) out.push(rec);
    }
    if (list.length < PAGE_SIZE) break;
    page++;
  }
  try {
    await mkdir();
    await write(cacheFile, JSON.stringify({ ts: Date.now(), body: out }));
  } catch {
    // 캐시 쓰기 실패는 치명적이지 않음
  }
  return out;
}

// 하루 전체 출국편 목록. flights-dep-{date}.json에 캐시 (TTL 12시간).
async function fetchDeparturesByDate(key: string, date: string): Promise<RawDeparture[]> {
  const cacheFile = join(CACHE_DIR_EXPORT, `flights-dep-${date}.json`);
  try {
    const cached = JSON.parse(await read(cacheFile)) as { ts: number; body: RawDeparture[] };
    if (Date.now() - cached.ts < 12 * 3600000 && cached.body.length > 0) return cached.body;
  } catch {
    // 캐시 없음/손상/권한 → 라이브 호출
  }
  const out: RawDeparture[] = [];
  let page = 1;
  for (;;) {
    const url = buildUrl(key, OP_DEP, { searchday: date, from_time: '0000', to_time: '2400', pageNo: String(page) });
    const text = await rawFetch(url);
    let json: { response?: { body?: { items?: unknown } } };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`JSON 파싱 실패 (${date} p${page}): ${text.slice(0, 300)}`);
    }
    const items = json?.response?.body?.items as unknown;
    const list = Array.isArray(items)
      ? (items as Record<string, unknown>[])
      : items
        ? [items as Record<string, unknown>]
        : [];
    if (list.length === 0) break;
    for (const r of list) {
      const rec = extractDeparture(r);
      if (rec) out.push(rec);
    }
    if (list.length < PAGE_SIZE) break;
    page++;
  }
  try {
    await mkdir();
    await write(cacheFile, JSON.stringify({ ts: Date.now(), body: out }));
  } catch {
    // 캐시 쓰기 실패는 치명적이지 않음
  }
  return out;
}

// 12자리 yyyyMMddHHmm → epoch 분
function toEpochMin(dt: string): number {
  return Math.floor(Date.parse(
    `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(8, 10)}:${dt.slice(10, 12)}:00+09:00`,
  ) / 60000);
}

const DOMESTIC_AIRPORTS = new Set(['GMP', 'CJU', 'PUS']);

export class LiveFlightAdapter implements FlightAdapter {
  constructor(private key: string) {}

  // flightNo 단건 조회: searchday 하루치 목록을 가져와 flightId/fid 매칭
  async lookup(flightNo: string, date?: string): Promise<FlightInfo | null> {
    const searchDate = date ?? isoDateOffset(0);
    const rows = await fetchArrivalsByDate(this.key, searchDate);
    const target = flightNo.toUpperCase();
    const match =
      rows.find((r) => r.flightId.toUpperCase() === target) ??
      rows.find((r) => r.fid.toUpperCase() === target);
    if (!match) return null;
    const d = delayMin(match.estimatedDateTime, match.scheduleDateTime);
    if (d === null) return null;
    return {
      flightNo: match.flightId,
      airline: match.airline,
      origin: match.airportCode,
      terminal: match.terminalid === 'P02' ? 'T2' : 'T1',
      scheduledArrivalMin: toEpochMin(match.scheduleDateTime),
      avgDelayMin: d,
      isDomestic: DOMESTIC_AIRPORTS.has(match.airportCode),
    };
  }

  // 유형 B: 출국편 조회. 탑승마감 = 출발시각 − (국제 40분 / 국내 20분).
  async lookupDeparture(flightNo: string, date?: string): Promise<FlightInfo | null> {
    const searchDate = date ?? isoDateOffset(0);
    const rows = await fetchDeparturesByDate(this.key, searchDate);
    const target = flightNo.toUpperCase();
    const match =
      rows.find((r) => r.flightId.toUpperCase() === target) ??
      rows.find((r) => r.fid.toUpperCase() === target);
    if (!match) return null;
    const isDomestic = DOMESTIC_AIRPORTS.has(match.airportCode);
    const departureMin = toEpochMin(match.scheduleDateTime);
    const d = delayMin(match.estimatedDateTime, match.scheduleDateTime);
    if (d === null) return null;
    return {
      flightNo: match.flightId,
      airline: match.airline,
      origin: match.airportCode,
      terminal: match.terminalid === 'P02' ? 'T2' : 'T1',
      scheduledArrivalMin: departureMin,
      avgDelayMin: d,
      isDomestic,
      // ponytail: 실시간 탑승마감 오퍼레이션 없음 → 국제 40분/국내 20분 전 고정 규칙 (§11 Phase 4)
      boardingDeadlineMin: departureMin - (isDomestic ? 20 : 40),
    };
  }

  async delayStats(route: string): Promise<Distribution> {
    const byRoute = PARAMS.flightDelayByRoute as Record<string, Distribution | string>;
    const dist = byRoute[route];
    return dist && typeof dist !== 'string' ? dist : PARAMS.flightDelay.default;
  }
}

