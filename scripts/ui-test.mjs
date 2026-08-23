/**
 * Automated UI click-through for Cockroach Life (Phaser canvas).
 * Usage: node scripts/ui-test.mjs [url]
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/?autotest=1';
const errors = [];
const results = [];

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const NEST = {
  sideMargin: 10,
  leftChromeW: 272,
  buildPanelW: 220,
  buildPanelTop: 112,
  defensePanelW: 252,
  defensePanelTop: 128,
  defensePanelH: 248,
  arcadePanelH: 140,
  arcadePanelBottom: 12,
};

/** HUD icons sit in a row above the build panel (see NestLayout.getNestHudButtonX). */
const HUD_START_X = GAME_WIDTH - NEST.sideMargin - NEST.buildPanelW + 32;
const HUD_Y = 56;
const HUD_SLOTS = [0, 1, 2, 3].map((i) => ({ x: HUD_START_X + i * 56, y: HUD_Y }));
const MODAL_CLOSE = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 210 };
const BUILD_FIRST_ROOM = {
  x: GAME_WIDTH - NEST.sideMargin - NEST.buildPanelW / 2,
  y: NEST.buildPanelTop + 52 + 22,
};
const ARCADE_SLIPPER = {
  x: NEST.sideMargin + 36,
  y: GAME_HEIGHT - NEST.arcadePanelH - NEST.arcadePanelBottom + 50,
};
const WORLD_MAP = {
  x: NEST.sideMargin + NEST.defensePanelW / 2,
  // Inside defense panel: header 36 + 3*(40+8) + half button ≈ firstBtn + 3*48
  y: NEST.defensePanelTop + 36 + 40 / 2 + 3 * (40 + 8) + 4,
};

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

async function tap(page, x, y) {
  await tapCanvas(page, x, y);
}

async function runStep(page, name, x, y, expectSceneAfter) {
  const before = await sceneKey(page);
  await tap(page, x, y);
  const after = await sceneKey(page);
  const ok = expectSceneAfter ? after === expectSceneAfter : after !== before || true;
  results.push({ name, x, y, before, after, ok: expectSceneAfter ? after === expectSceneAfter : true });
  if (expectSceneAfter && after !== expectSceneAfter) {
    errors.push(`${name}: expected scene ${expectSceneAfter}, got ${after}`);
  }
  return after;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
});

log(`URL: ${url}`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

if (!(await waitForTestApi(page))) {
  errors.push('Test API not available (__CL_TEST__)');
  console.log('RESULTS:', JSON.stringify(results, null, 2));
  console.log('ERRORS:', errors.join('\n') || '(none)');
  await browser.close();
  process.exit(1);
}

await waitScene(page, 'MenuScene', 20000);
log('Scene: MenuScene');
await page.waitForTimeout(1200);

// Menu — Play
await runStep(page, 'menu-play', 640, 268, 'NestScene');
await page.waitForTimeout(800);

// Nest HUD buttons (row above build panel)
const hudNames = ['hud-daily', 'hud-shop', 'hud-breeding', 'hud-season'];
for (let i = 0; i < hudNames.length; i++) {
  const before = await sceneKey(page);
  await tap(page, HUD_SLOTS[i].x, HUD_SLOTS[i].y);
  await page.waitForTimeout(500);
  await tap(page, MODAL_CLOSE.x, MODAL_CLOSE.y);
  await page.waitForTimeout(300);
  const after = await sceneKey(page);
  results.push({
    name: hudNames[i],
    x: HUD_SLOTS[i].x,
    y: HUD_SLOTS[i].y,
    before,
    after,
    ok: after === 'NestScene',
  });
}

// Build panel first room button
await tap(page, BUILD_FIRST_ROOM.x, BUILD_FIRST_ROOM.y);
await page.waitForTimeout(300);

// Arcade — slipper (first)
await runStep(page, 'arcade-slipper', ARCADE_SLIPPER.x, ARCADE_SLIPPER.y, 'SlipperDodgeScene');
await page.waitForTimeout(600);
await page.keyboard.press('Escape');
await waitScene(page, 'NestScene', 8000);

// World map from defense panel
await runStep(page, 'world-map', WORLD_MAP.x, WORLD_MAP.y, 'WorldMapScene');
await page.waitForTimeout(500);
await page.keyboard.press('Escape');
await waitScene(page, 'NestScene', 8000);

log('\n=== UI TEST RESULTS ===');
for (const r of results) {
  log(`${r.ok ? 'OK' : 'FAIL'}  ${r.name} @ (${r.x},${r.y})  ${r.before} -> ${r.after}`);
}
log(`\nTotal: ${results.length}, failed: ${results.filter((r) => !r.ok).length}`);
log('ERRORS:', errors.length ? errors.join('\n') : '(none)');

await browser.close();
process.exit(errors.length > 0 || results.some((r) => !r.ok) ? 1 : 0);
