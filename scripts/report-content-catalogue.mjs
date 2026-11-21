import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, entries: ['src/content/engine.ts'] },
  server: { middlewareMode: true },
});
try {
  const { auditCatalogue } = await server.ssrLoadModule('/src/content/engine.ts');
  console.log(JSON.stringify(auditCatalogue(), null, 2));
} finally {
  await server.close();
}
