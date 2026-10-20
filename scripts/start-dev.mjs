import { existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = path.join(root, 'node_modules/vite/bin/vite.js');
const url = 'http://127.0.0.1:5180/';
const [major, minor] = process.versions.node.split('.').map(Number);

async function portInUse() {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: 5180 });
    socket.setTimeout(1500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); reject(new Error('Port check timed out.')); });
    socket.once('error', error => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve(false);
      else reject(error);
    });
  });
}

async function main() {
  if (major < 24 || (major === 24 && minor < 15)) throw new Error('Node.js 24.15+ is required.');
  if (!existsSync(vite)) throw new Error('Dependencies missing. Run npm ci in this project first.');
  console.log(`Project: ${root}\nURL: ${url}`);
  if (await portInUse()) {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const html = await response.text();
    if (response.ok && /<title>NEON DODGE · Combat Lab<\/title>/.test(html)) {
      console.log('NEON DODGE is already running. Open the URL above.');
      return;
    }
    throw new Error('Port 5180 belongs to another service. It was not stopped. Resolve the conflict before retrying.');
  }
  console.log('Keep this window open while playing. Press Ctrl+C to stop.');
  const child = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', '5180', '--strictPort'], {
    cwd: root, stdio: 'inherit', shell: false,
  });
  child.once('error', error => { console.error(error.message); process.exitCode = 1; });
  child.once('exit', code => { process.exitCode = code ?? 1; });
  process.on('SIGINT', () => { if (!child.killed) child.kill('SIGINT'); });
  process.on('SIGTERM', () => { if (!child.killed) child.kill('SIGTERM'); });
}

main().catch(error => { console.error(`Startup failed: ${error.message}`); process.exitCode = 1; });
