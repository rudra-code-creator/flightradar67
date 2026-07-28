/**
 * Capture FlightRadar67 demo assets for the pitch deck.
 * Run: npx playwright test isn't needed — node this file with playwright.
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  console.log("Opening app…");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000); // Cesium + ADS-B warm-up

  await page.screenshot({ path: path.join(OUT, "01-live-globe.png"), fullPage: false });
  console.log("Saved 01-live-globe.png");

  // Try clicking a flight entity via canvas center-ish / random canvas clicks
  const canvas = page.locator("canvas").first();
  if (await canvas.count()) {
    const box = await canvas.boundingBox();
    if (box) {
      // Sweep a few clicks to select an aircraft
      const points = [
        [0.48, 0.45],
        [0.52, 0.48],
        [0.55, 0.42],
        [0.45, 0.5],
        [0.5, 0.55],
        [0.58, 0.5],
        [0.42, 0.42],
      ];
      for (const [fx, fy] of points) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
        await page.waitForTimeout(900);
        const panel = page.locator("text=/Live ADS-B|Route|en route/i").first();
        if (await panel.count()) break;
      }
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT, "02-flight-selected.png"), fullPage: false });
      console.log("Saved 02-flight-selected.png");

      // Slow pan for video interest
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.45, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, "03-globe-pan.png"), fullPage: false });
    }
  }

  // Analytics page
  try {
    await page.goto("http://localhost:3000/analytics", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, "04-analytics.png"), fullPage: false });
    console.log("Saved 04-analytics.png");
  } catch (e) {
    console.warn("analytics skip", e.message);
  }

  // Back to map for closing video frames
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, "05-hero-close.png"), fullPage: false });

  await context.close();
  await browser.close();

  // Rename recorded webm
  const videos = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm"));
  if (videos[0]) {
    const dest = path.join(OUT, "demo-walkthrough.webm");
    fs.renameSync(path.join(OUT, videos[0]), dest);
    console.log("Saved demo-walkthrough.webm");
  }
  console.log("Done.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
