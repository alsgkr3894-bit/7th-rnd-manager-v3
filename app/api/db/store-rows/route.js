import { applyStoreRowOperations } from '@/lib/server/store-row-sync';
import { getPrismaClient } from '@/lib/server/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await applyStoreRowOperations(getPrismaClient(), payload);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown store row sync error',
        checkedAt: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}
