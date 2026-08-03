import { NextResponse } from 'next/server';
import { tour } from '@/lib/adapters';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const station = searchParams.get('station') ?? '';
  const radius = Number(searchParams.get('radius') ?? 15);
  try {
    const spots = await tour.nearby(station, radius);
    return NextResponse.json(spots);
  } catch {
    return NextResponse.json([]);
  }
}
