import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const server = await createServer({
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, entries: ['src/content/engine.ts'] },
  server: { middlewareMode: true },
});
try {
  const { auditCatalogue } = await server.ssrLoadModule('/src/content/engine.ts');
  const report = auditCatalogue();
  const reportPath = resolve(process.argv[2] ?? 'reports/content-catalogue-audit.json');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await server.close();
}
