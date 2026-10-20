// Optional project-local npm for environments that provide Node without npm.
// Does not modify system PATH, global packages, or other projects.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tools = new URL('../.tools/', import.meta.url);
await mkdir(tools, { recursive: true });
const response = await fetch('https://registry.npmjs.org/npm/12.2.0');
if (!response.ok) throw new Error(`npm metadata: ${response.status}`);
const metadata = await response.json();
const download = await fetch(metadata.dist.tarball);
if (!download.ok) throw new Error(`npm download: ${download.status}`);
const bytes = Buffer.from(await download.arrayBuffer());
const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
if (integrity !== metadata.dist.integrity) throw new Error('npm integrity mismatch');
const archive = new URL('npm.tgz', tools);
await writeFile(archive, bytes);
execFileSync('tar', ['-xf', fileURLToPath(archive), '-C', fileURLToPath(tools)]);
console.log('Project-local npm verified and extracted to .tools/package');
