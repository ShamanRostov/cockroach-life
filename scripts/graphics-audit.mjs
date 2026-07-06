/**
 * Graphics audit — load NestScene and capture a screenshot for visual/regression checks.
 * Usage: node scripts/graphics-audit.mjs [url]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const screenshotPath = path.join(root, 'logs', 'nest-audit.png');

const url = process.argv[2] ?? 'http://127.0.0.1:5173/?autotest=1';
const consoleErrors = [];
const assetLoadFailures = [];

const ASSET_FAILURE_PATTERNS = [
  /failed to load/i,
  /load error/i,
  /failed to process file/i,
  /error loading/i,
  /404.*\/assets\//i,
  /net::err_/i,
];

function isAssetLoadFailure(text) {
  return ASSET_FAILURE_PATTERNS.some((re) => re.test(text));
}

function log(msg) {
  console.log(msg);
}

async function waitForTestApi(page, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => Boolean(window.__CL_TEST__));
    if (ready) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

async function sceneKey(page) {
  return page.evaluate(() => window.__CL_TEST__?.getActiveSceneKey() ?? null);
}

async function waitScene(page, key, timeoutMs = 12000) {
  return page.evaluate(
    ([k, t]) => window.__CL_TEST__?.waitForScene(k, t) ?? Promise.resolve(false),
    [key, timeoutMs],
  );
}

async function tapCanvas(page, gameX, gameY) {
  const coords = await page.evaluate(
    ({ gx, gy }) => {
      const game = window.__CL_GAME__;
      if (!game) return null;
      const rect = game.canvas.getBoundingClientRect();
      const scale = Math.min(rect.width / game.scale.width, rect.height / game.scale.height);
      const displayW = game.scale.width * scale;
      const displayH = game.scale.height * scale;
      const offsetX = rect.left + (rect.width - displayW) / 2;
      const offsetY = rect.top + (rect.height - displayH) / 2;
      return { x: offsetX + gx * scale, y: offsetY + gy * scale };
    },
    { gx: gameX, gy: gameY },
  );
  if (!coords) throw new Error('Canvas coords unavailable');
  await page.mouse.click(coords.x, coords.y);
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('pageerror', (e) => {
  const msg = `PAGE: ${e.message}`;
  consoleErrors.push(msg);
  if (isAssetLoadFailure(msg)) assetLoadFailures.push(msg);
});

page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  const msg = `CONSOLE: ${text}`;
  consoleErrors.push(msg);
  if (isAssetLoadFailure(text)) assetLoadFailures.push(msg);
});

page.on('response', (response) => {
  const reqUrl = response.url();
  if (!reqUrl.includes('/assets/')) return;
  const status = response.status();
  if (status >= 400) {
    const msg = `HTTP ${status}: ${reqUrl}`;
    assetLoadFailures.push(msg);
    consoleErrors.push(`ASSET: ${msg}`);
  }
});

log(`URL: ${url}`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

let exitCode = 0;
let activeScene = null;

try {
  if (!(await waitForTestApi(page))) {
    consoleErrors.push('Test API not available (__CL_TEST__)');
    exitCode = 1;
  } else {
    await waitScene(page, 'MenuScene', 20000);
    log('Scene before play: MenuScene');
    await page.waitForTimeout(1200);

    await tapCanvas(page, 640, 268);
    const reachedNest = await waitScene(page, 'NestScene', 15000);
    activeScene = await sceneKey(page);

    if (!reachedNest || activeScene !== 'NestScene') {
      consoleErrors.push(`Expected NestScene after play, got ${activeScene ?? '(null)'}`);
      exitCode = 1;
    }

    await page.waitForTimeout(800);
    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await page.locator('#game-container').screenshot({ path: screenshotPath, type: 'png' });
    log(`Screenshot: ${screenshotPath}`);
  }
} catch (error) {
  consoleErrors.push(`SCRIPT: ${error.message}`);
  exitCode = 1;
}

log('\n=== GRAPHICS AUDIT ===');
log(`Scene key: ${activeScene ?? '(unknown)'}`);
log(`Console errors: ${consoleErrors.length}`);
if (consoleErrors.length) {
  for (const err of consoleErrors) log(`  ${err}`);
} else {
  log('  (none)');
}

log(`Asset load failures: ${assetLoadFailures.length}`);
if (assetLoadFailures.length) {
  for (const err of assetLoadFailures) log(`  ${err}`);
  exitCode = 1;
} else {
  log('  (none)');
}

await browser.close();
process.exit(exitCode);
