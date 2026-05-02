// Readiness check — verifies DB connectivity. TechSpec §6.2.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ready', checks: { db: 'ok' } });
  } catch {
    return NextResponse.json(
      { status: 'not_ready', checks: { db: 'fail' } },
      { status: 503 },
    );
  }
}
