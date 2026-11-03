import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

await mkdir(path.join(standalone, '.next'), { recursive: true });
await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {
  recursive: true,
  force: true
});

try {
  await cp(path.join(root, 'public'), path.join(standalone, 'public'), {
    recursive: true,
    force: true
  });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log('Prepared standalone Next.js app for the Windows installer.');
