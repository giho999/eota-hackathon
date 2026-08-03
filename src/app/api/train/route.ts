import { NextResponse } from 'next/server';
import { train } from '@/lib/adapters';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const after = Number(searchParams.get('after') ?? 0);
  const options = await train.search(from, to, after);
  return NextResponse.json(options);
}
