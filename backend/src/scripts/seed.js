// DEPRECATED — use: bun run seed  (runs seed.sh via psql, ~1 second)
// The Node pg driver hangs in some environments; psql is reliable.
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const result = spawnSync('bash', [join(dir, 'seed.sh')], { stdio: 'inherit' });
process.exit(result.status ?? 1);
