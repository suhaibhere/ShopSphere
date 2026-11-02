import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

if (process.env.VERCEL_ENV !== 'production') process.exit(0);
if (!process.env.DIRECT_URL || !process.env.DATABASE_URL || !process.env.SESSION_DATABASE_URL) {
  throw new Error(
    'Set DATABASE_URL, DIRECT_URL, and SESSION_DATABASE_URL in Vercel before a production deployment.',
  );
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const prismaCli = resolve(root, 'node_modules/prisma/build/index.js');
for (const args of [
  ['migrate', 'deploy'],
  ['db', 'seed'],
]) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: resolve(root, 'apps/api'),
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
