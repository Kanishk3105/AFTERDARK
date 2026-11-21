import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const server = await createServer({
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, entries: ['src/content/coverage.ts'] },
  server: { middlewareMode: true },
});
try {
  const { buildGameContentCoverage } = await server.ssrLoadModule('/src/content/coverage.ts');
  const matrix = buildGameContentCoverage();
  const outputPath = resolve(process.argv[2] ?? 'reports/game-content-coverage.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(matrix, null, 2));
} finally {
  await server.close();
}
