// 라이브 어댑터 공용 유틸: API 호출, XML 에러 감지, TTL 캐시
// ponytail: Vercel 서버리스에서 .cache 쓰기 실패 대비 — os.tmpdir() 사용 + I/O 실패 시 캐시 없이 진행
import { mkdir as fsMkdir, readFile, writeFile, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const CACHE_DIR = join(tmpdir(), 'eota-cache');

// 다른 live 어댑터가 캐시 파일 경로 구성에 사용
export const CACHE_DIR_EXPORT = CACHE_DIR;

// KEY에 URL 인코딩(%)이 포함되어 있으면 그대로, 아니면 encodeURIComponent 적용
export function serviceKeyParam(key: string): string {
  return key.includes('%') ? key : encodeURIComponent(key);
}

// XML 응답에서 <tag>value</tag> 목록 추출
export function xmlTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

export function isXmlError(text: string): boolean {
  return text.includes('<resultCode>') && text.includes('ERROR') || text.includes('<errMsg>');
}

export class ApiError extends Error {}

// 외부 API가 불통이면 8초 안에 실패 처리 (앱 마비 방지). 성공 시 캐시 저장.
async function fetchWithTimeout(url: string, ms = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// 타임아웃+XML 에러 감지 없는 원시 호출 (호출자가 파싱/캐시 책임)
export async function rawFetch(url: string): Promise<string> {
  const text = await fetchWithTimeout(url);
  if (isXmlError(text)) {
    throw new ApiError(`API 에러 응답: ${text.slice(0, 300)}`);
  }
  return text;
}

// TTL(분) 내면 캐시 반환. 모든 I/O 실패는 조용히 무시 → 캐시 없이 라이브 호출 (크래시 없음).
export async function cachedFetch(
  name: string,
  url: string,
  ttlMin: number,
): Promise<string> {
  const file = join(CACHE_DIR, `${name}.json`);
  try {
    const cached = JSON.parse(await readFile(file, 'utf8')) as { ts: number; body: string };
    if (Date.now() - cached.ts < ttlMin * 60000) return cached.body;
  } catch {
    // 캐시 없음/손상/권한 — 그냥 라이브 호출로 진행
  }
  const text = await rawFetch(url);
  try {
    await fsMkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, JSON.stringify({ ts: Date.now(), body: text }));
  } catch {
    // 캐시 쓰기 실패는 치명적이지 않음 — 다음 요청은 라이브 호출
  }
  return text;
}

export function exists(p: string): Promise<boolean> {
  return stat(p).then(() => true, () => false);
}
export function read(p: string): Promise<string> {
  return readFile(p, 'utf8');
}
export function write(p: string, data: string): Promise<void> {
  return writeFile(p, data);
}
export async function mkdir(): Promise<void> {
  await fsMkdir(CACHE_DIR, { recursive: true });
}
