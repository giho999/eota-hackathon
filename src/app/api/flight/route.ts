import { NextResponse } from 'next/server';
import { MockFlightAdapter } from '@/lib/adapters/mock/MockFlightAdapter';
import { LiveFlightAdapter } from '@/lib/adapters/live/LiveFlightAdapter';

const key = process.env.DATA_GO_KR_KEY ?? '';
// ponytail: 키가 있어도 API 불통(타임아웃/에러) 시 mock으로 폴백 — 앱이 죽지 않게 (§2-4)
const live = new LiveFlightAdapter(key);
const mock = new MockFlightAdapter();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const no = searchParams.get('no') ?? '';
  const direction = searchParams.get('direction') ?? 'arr';
  if (!no) return NextResponse.json({ error: 'no 파라미터 필요' }, { status: 400 });
  const lookup = direction === 'dep'
    ? (fn: string) => live.lookupDeparture?.(fn) ?? mock.lookupDeparture?.(fn) ?? null
    : (fn: string) => live.lookup(fn);
  if (!key) {
    const info = direction === 'dep' ? await mock.lookupDeparture?.(no) : await mock.lookup(no);
    return NextResponse.json(info ?? { error: '편명을 찾을 수 없어요' });
  }
  try {
    const info = await lookup(no);
    // live가 해당 편명을 못 찾으면(null) mock 폴백 — 데모/실데이터 혼용 흐름 유지
    if (info) return NextResponse.json(info);
    const fallback = direction === 'dep' ? await mock.lookupDeparture?.(no) : await mock.lookup(no);
    return NextResponse.json(fallback ?? { error: '편명을 찾을 수 없어요' });
  } catch {
    // 실시간 조회 실패 → mock 폴백 (데모 흐름 유지)
    const info = direction === 'dep' ? await mock.lookupDeparture?.(no) : await mock.lookup(no);
    return NextResponse.json(info ?? { error: '편명을 찾을 수 없어요' });
  }
}
