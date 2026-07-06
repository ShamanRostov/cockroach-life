/**
 * Full verify: build, start vite preview, smoke + UI tests, then exit.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.VERIFY_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}/?autotest=1`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server not ready at ${url}`);
}

let preview = null;

function stopPreview() {
  if (preview && !preview.killed) {
    preview.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  stopPreview();
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopPreview();
  process.exit(143);
});

try {
  await run('npm', ['run', 'build']);

  preview = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'], cwd: root },
  );

  preview.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  preview.stderr?.on('data', (chunk) => process.stderr.write(chunk));

  await waitForServer(BASE_URL);
  console.log(`Preview ready: ${BASE_URL}`);

  await run('node', ['scripts/smoke-test.mjs', BASE_URL]);
  await run('node', ['scripts/ui-test.mjs', BASE_URL]);

  console.log('\n=== VERIFY OK ===');
} catch (error) {
  console.error('\n=== VERIFY FAILED ===');
  console.error(error.message ?? error);
  stopPreview();
  process.exit(1);
}

stopPreview();
process.exit(0);
