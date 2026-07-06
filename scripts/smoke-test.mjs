import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5174/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(`PAGE: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(10000);

const canvas = await page.locator('#game-container canvas').count();
console.log('URL:', url);
console.log('CANVAS_COUNT:', canvas);
console.log('ERRORS:', errors.length ? errors.join('\n') : '(none)');

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
