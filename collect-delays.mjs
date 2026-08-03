#!/usr/bin/env node
/**
 * 인천공항 도착편 지연 데이터 소급 수집기
 *
 * 운항현황 API는 D-3 ~ D+6만 조회 가능하다.
 * 오늘 받지 않은 과거 데이터는 영원히 사라지므로, 매일 1회 실행해 누적한다.
 *
 *   export DATA_GO_KR_KEY="발급받은_인증키"
 *
 *   node collect-delays.mjs --probe        스키마 확인 (먼저 이걸 실행)
 *   node collect-delays.mjs                D-3 ~ D+0 수집 후 누적 저장
 *   node collect-delays.mjs --stats        쌓인 데이터로 감마 모수 추정
 */

import fs from 'node:fs';
import path from 'node:path';

// ── 설정 ──────────────────────────────────────────────
// 엔드포인트와 파라미터명은 공공데이터포털 "여객기 운항 현황 상세 조회 서비스"
// 활용신청 상세 페이지의 참고문서에서 반드시 확인할 것. 아래는 일반적인 형태.
const BASE = 'https://apis.data.go.kr/B551177/StatusOfPassengerFlightsDeOdp';
const OP = '/getPassengerArrivalsDeOdp';

const KEY = process.env.DATA_GO_KR_KEY;
const OUT = path.resolve('.cache/delays.jsonl');
const DAYS_BACK = 3;
const PAGE_SIZE = 1000;

if (!KEY) {
  console.error('DATA_GO_KR_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

async function call(params) {
  const qs = new URLSearchParams({
    type: 'json',
    numOfRows: String(PAGE_SIZE),
    ...params,
  });
  const preEncoded = KEY.includes('%');
  const keyPart = preEncoded ? KEY : encodeURIComponent(KEY);
  const url = `${BASE}${OP}?serviceKey=${keyPart}&${qs}`;
  const res = await fetch(url);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    throw new Error(`XML 응답 (키 미활성 또는 파라미터 오류):\n${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

async function probe() {
  const json = await call({ from_time: '0000', to_time: '2400', pageNo: '1' });
  console.log('--- 최상위 키 ---');
  console.log(Object.keys(json));
  const items =
    json?.response?.body?.items?.item ?? json?.response?.body?.items ?? json?.items ?? [];
  const list = Array.isArray(items) ? items : [items];
  console.log(`\n--- 레코드 수: ${list.length} ---`);
  if (list.length) {
    console.log('\n--- 첫 레코드 ---');
    console.log(JSON.stringify(list[0], null, 2));
    console.log('\n--- 필드 목록 ---');
    console.log(Object.keys(list[0]).join(', '));
  }
  console.log('\n위 필드명을 보고 아래 extract() 의 매핑을 실제 이름으로 고치세요.');
}

function extract(r) {
  return {
    fid: r.fid ?? null,
    flightId: r.flightId ?? null,
    airline: r.airline ?? null,
    origin: r.airportCode ?? null,
    terminal: r.terminalid ?? null,
    remark: r.remark ?? null,
    scheduled: r.scheduleDateTime,
    actual: r.estimatedDateTime,
  };
}

function toMinutes(v) {
  if (v == null) return null;
  const s = String(v).replace(/\D/g, '');
  if (s.length < 4) return null;
  const hh = Number(s.slice(-4, -2));
  const mm = Number(s.slice(-2));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function delayOf(rec) {
  const s = toMinutes(rec.scheduled);
  const a = toMinutes(rec.actual);
  if (s == null || a == null) return null;
  let d = a - s;
  if (d < -720) d += 1440;
  if (d > 720) d -= 1440;
  return d;
}

async function collect() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const seen = new Set();
  if (fs.existsSync(OUT)) {
    for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { seen.add(JSON.parse(line)._k); } catch {}
    }
  }
  console.log(`기존 누적 ${seen.size}건`);

  const rows = [];
  for (let back = DAYS_BACK; back >= 0; back--) {
    const d = new Date(Date.now() - back * 86400000);
    const date = ymd(d);
    let page = 1, got = 0;
    while (true) {
      const json = await call({
        searchday: date,
        from_time: '0000',
        to_time: '2400',
        pageNo: String(page),
      });
      const items =
        json?.response?.body?.items?.item ?? json?.response?.body?.items ?? [];
      const list = Array.isArray(items) ? items : [items];
      if (!list.length) break;

      for (const r of list) {
        const rec = extract(r);
        if (rec.remark !== '도착') continue;
        const delay = delayOf(rec);
        if (delay == null || !rec.fid) continue;
        const k = rec.fid;
        if (seen.has(k)) continue;
        seen.add(k);
        rows.push({ _k: k, date, ...rec, delayMin: delay });
      }
      got += list.length;
      if (list.length < PAGE_SIZE) break;
      page++;
    }
    console.log(`  ${date}: 조회 ${got}건`);
    await new Promise((r) => setTimeout(r, 300));
  }

  if (rows.length) {
    fs.appendFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
  console.log(`신규 ${rows.length}건 저장 → ${OUT}`);
  console.log(`총 누적 ${seen.size}건`);
}

function stats() {
  if (!fs.existsSync(OUT)) return console.error('수집 데이터가 없습니다.');
  const byRoute = new Map();
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const d = Math.max(0, r.delayMin);
    const key = r.origin ?? 'ALL';
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key).push(d);
    if (!byRoute.has('ALL')) byRoute.set('ALL', []);
    if (key !== 'ALL') byRoute.get('ALL').push(d);
  }

  const fit = (xs) => {
    const n = xs.length;
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const varc = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
    const scale = varc / mean;
    const shape = mean / scale;
    return { n, mean, sd: Math.sqrt(varc), shape, scale };
  };

  console.log('노선(출발지)별 지연 감마 모수 — params.ts 에 넣을 값\n');
  const rows = [...byRoute.entries()]
    .filter(([, xs]) => xs.length >= 30)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15);
  for (const [route, xs] of rows) {
    const f = fit(xs);
    console.log(
      `${route.padEnd(8)} n=${String(f.n).padStart(5)}  ` +
      `평균 ${f.mean.toFixed(1)}분  표준편차 ${f.sd.toFixed(1)}  ` +
      `→ gamma(shape: ${f.shape.toFixed(2)}, scale: ${f.scale.toFixed(2)})`
    );
  }
  console.log('\n표본 30건 미만 노선은 생략했습니다.');
}

const mode = process.argv[2];
if (mode === '--probe') probe().catch((e) => console.error(e.message));
else if (mode === '--stats') stats();
else collect().catch((e) => console.error(e.message));