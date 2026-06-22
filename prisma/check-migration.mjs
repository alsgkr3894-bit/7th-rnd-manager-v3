import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MIGRATION_PATH = 'prisma/migrations/20260622060000_init_server_store/migration.sql';
const PRISMA_CLI_PATH = 'node_modules/prisma/build/index.js';

function normalizeSql(sql) {
  return String(sql)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

async function generatedSqlFromSchema() {
  const { stdout } = await execFileAsync(process.execPath, [
    PRISMA_CLI_PATH,
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema',
    'prisma/schema.prisma',
    '--script',
  ]);
  return stdout;
}

async function main() {
  const [expectedSql, migrationSql] = await Promise.all([
    generatedSqlFromSchema(),
    readFile(MIGRATION_PATH, 'utf8'),
  ]);

  if (normalizeSql(expectedSql) !== normalizeSql(migrationSql)) {
    throw new Error(
      `${MIGRATION_PATH} is out of sync with prisma/schema.prisma. Regenerate it with prisma migrate diff.`
    );
  }

  console.log(`${MIGRATION_PATH} matches prisma/schema.prisma.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
