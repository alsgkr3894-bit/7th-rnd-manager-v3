import { readDbHealth } from '@/lib/server/db-health';
import { getPrismaClient } from '@/lib/server/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const health = await readDbHealth(getPrismaClient());
    return Response.json(health);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown DB health check error',
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
