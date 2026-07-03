import { spawn, execSync } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "store-assets", "screenshots");
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}/?screenshots=1`;

const SHOTS = [
  { button: "1. Nest building", file: "01-nest-building.png" },
  { button: "2. Slipper dodge", file: "02-slipper-dodge.png" },
  { button: "3. Raid infiltration", file: "03-raid-infiltration.png" },
  { button: "4. World map", file: "04-world-map.png" },
  { button: "5. Breeding panel", file: "05-breeding-panel.png" },
  { button: "6. Shop + daily", file: "06-shop-daily-quests.png" },
];

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isServerUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // preview still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Preview server did not respond at ${url}`);
}

function startPreview() {
  const args = [
    "run",
    "preview",
    "--",
    "--port",
    String(port),
    "--strictPort",
    "--host",
    "127.0.0.1",
  ];
  const child = spawn("npm", args, {
    cwd: root,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(`[preview] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[preview] ${chunk}`));

  return child;
}

async function main() {
  const distIndex = path.join(root, "dist", "index.html");
  if (!(await pathExists(distIndex))) {
    console.error("dist/index.html not found. Run: npm run build");
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  const previewUrl = `http://127.0.0.1:${port}/`;
  let preview = null;
  let startedPreview = false;

  const stopPreview = () => {
    if (!preview?.pid || preview.killed) return;
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /PID ${preview.pid} /T /F`, { stdio: "ignore" });
      } catch {
        // process already exited
      }
    } else {
      preview.kill("SIGTERM");
    }
  };

  if (await isServerUp(previewUrl)) {
    console.log(`[preview] reusing server at ${previewUrl}`);
  } else {
    preview = startPreview();
    startedPreview = true;
    process.on("exit", stopPreview);
    process.on("SIGINT", () => {
      stopPreview();
      process.exit(130);
    });
    await waitForServer(previewUrl);
  }

  try {

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForSelector("#screenshot-mode-panel", { timeout: 60_000 });
    await page.waitForSelector("#game-container canvas", { timeout: 60_000 });

    for (const shot of SHOTS) {
      const btn = page.locator("#screenshot-mode-panel button").filter({ hasText: shot.button });
      await btn.first().click();
      await page.waitForTimeout(3000);
      await page.evaluate(() => {
        const panel = document.getElementById("screenshot-mode-panel");
        if (panel) panel.style.display = "none";
      });
      await page.locator("#game-container").screenshot({
        path: path.join(outDir, shot.file),
        type: "png",
      });
      await page.evaluate(() => {
        const panel = document.getElementById("screenshot-mode-panel");
        if (panel) panel.style.display = "";
      });
      console.log(`Saved ${shot.file}`);
    }

    await browser.close();
    console.log("All screenshots captured.");
  } finally {
    if (startedPreview) stopPreview();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



