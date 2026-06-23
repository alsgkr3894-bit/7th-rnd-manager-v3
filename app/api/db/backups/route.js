import { createLocalDbBackup, listLocalDbBackups } from '@/lib/server/local-db-backups';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json(listLocalDbBackups());
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown local backup status error',
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await createLocalDbBackup();
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown local backup create error',
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
