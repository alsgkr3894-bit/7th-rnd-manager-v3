import { spawn } from 'node:child_process';

function usage() {
  return [
    'Usage:',
    '  npm run db:bootstrap -- [--plan] [--backup <backup.json>] [--brand <brandId>] [--dry-run-import] [--include-shared] [--no-local-storage]',
    '',
    'Runs:',
    '  1. npm run db:migrate',
    '  2. npm run db:seed',
    '  3. optional backup import or import dry-run',
    '  4. npm run db:check',
    '',
    'Examples:',
    '  npm run db:bootstrap -- --plan',
    '  npm run db:bootstrap',
    '  npm run db:bootstrap -- --backup ./backup.json --brand main --dry-run-import',
    '  npm run db:bootstrap -- --backup ./backup.json --brand china4',
  ].join('\n');
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    help: false,
    plan: false,
    backup: '',
    brand: '',
    dryRunImport: false,
    includeShared: false,
    importLocalStorage: true,
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--plan') {
      options.plan = true;
      continue;
    }
    if (arg === '--backup') {
      options.backup = String(args.shift() || '').trim();
      continue;
    }
    if (arg === '--brand') {
      options.brand = String(args.shift() || '').trim();
      continue;
    }
    if (arg === '--dry-run-import') {
      options.dryRunImport = true;
      continue;
    }
    if (arg === '--include-shared') {
      options.includeShared = true;
      continue;
    }
    if (arg === '--no-local-storage') {
      options.importLocalStorage = false;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function commandForNpm() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function shellCommandForNpm(scriptName, scriptArgs = []) {
  const quoted = ['run', scriptName, '--', ...scriptArgs].map(arg => {
    const text = String(arg);
    return /[\s"]/u.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
  });
  return `${commandForNpm()} ${quoted.join(' ')}`;
}

function runNpmScript(scriptName, scriptArgs = []) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn(shellCommandForNpm(scriptName, scriptArgs), { stdio: 'inherit', shell: true })
        : spawn(commandForNpm(), ['run', scriptName, '--', ...scriptArgs], {
            stdio: 'inherit',
            shell: false,
          });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

function backupImportArgs(options) {
  if (!options.backup) return [];
  const args = [options.backup];
  if (options.brand) args.push('--brand', options.brand);
  if (options.includeShared) args.push('--include-shared');
  if (!options.importLocalStorage) args.push('--no-local-storage');
  return args;
}

function plannedScripts(options) {
  const scripts = [
    { name: 'db:migrate', args: [] },
    { name: 'db:seed', args: [] },
  ];

  if (options.backup) {
    scripts.push({
      name: options.dryRunImport ? 'db:import:backup:dry-run' : 'db:import:backup',
      args: backupImportArgs(options),
    });
  }

  scripts.push({ name: 'db:check', args: [] });
  return scripts;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const scripts = plannedScripts(options);
  if (options.plan) {
    console.log(
      scripts
        .map(({ name, args }) => `npm run ${name}${args.length ? ` -- ${args.join(' ')}` : ''}`)
        .join('\n')
    );
    return;
  }

  for (const { name, args } of scripts) {
    await runNpmScript(name, args);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
