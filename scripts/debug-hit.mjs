import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/?autotest=1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  const game = window.__CL_GAME__;
  if (!game) return { error: 'no game' };
  const scene = game.scene.getScenes(true).find((s) => s.scene.isActive());
  if (!scene) return { error: 'no scene' };

  const buttonPositions = [];
  const walk = (obj, ox = 0, oy = 0) => {
    const wx = ox + (obj.x ?? 0);
    const wy = oy + (obj.y ?? 0);
    if (obj.input?.enabled) {
      buttonPositions.push({
        type: obj.type,
        x: wx,
        y: wy,
        w: obj.displayWidth ?? obj.width,
        h: obj.displayHeight ?? obj.height,
        depth: obj.depth,
      });
    }
    if (obj.type === 'Container' && obj.list) {
      obj.list.forEach((c) => walk(c, wx, wy));
    }
  };
  scene.children.list.forEach((o) => walk(o));

  const pointer = scene.input.activePointer;
  const hitResults = [];
  for (const pt of [
    { x: 640, y: 268 },
    { x: 640, y: 278 },
    { x: 1224, y: 52 },
  ]) {
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.worldX = pt.x;
    pointer.worldY = pt.y;
    const list = scene.input.hitTestPointer(pointer);
    hitResults.push({ ...pt, count: list.length });
  }

  return {
    scene: scene.scene.key,
    interactiveTotal: buttonPositions.length,
    buttonPositions: buttonPositions.slice(0, 20),
    hitResults,
  };
});

console.log('BEFORE', JSON.stringify(info, null, 2));

await page.mouse.click(640, 268);
await page.waitForTimeout(1500);

const after = await page.evaluate(() => {
  const game = window.__CL_GAME__;
  const scene = game?.scene.getScenes(true).find((s) => s.scene.isActive());
  return scene?.scene.key ?? null;
});
console.log('AFTER CLICK scene:', after);

await browser.close();
