import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' && existsSync(installedChrome) ? installedChrome : undefined);
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 30000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4174/neon-dodge/', viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/test-server.mjs', url: 'http://127.0.0.1:4174/neon-dodge/', reuseExistingServer: false, timeout: 60000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5181 --strictPort',
      url: 'http://127.0.0.1:5181/', reuseExistingServer: false, timeout: 30000 },
  ],
});
