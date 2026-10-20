import { build, preview } from 'vite';
const config = { base: '/neon-dodge/', build: { outDir: 'test-results/site' },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true } };
await build(config);
const server = await preview(config);
server.printUrls();
