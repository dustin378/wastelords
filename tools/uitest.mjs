// Headless UI verification against the local harness.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const [code, token] = readFileSync("/tmp/harness/session.txt", "utf8").trim().split(" ");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("cloudfront")) errors.push(`console: ${m.text()}`); });

// 1. landing
await page.goto("http://localhost:8788/", { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/harness/shot-landing.png", fullPage: true });

// 2. login as existing player via UI
await page.click("#tab-login");
await page.fill("#form-login input[name=code]", code);
await page.fill("#form-login input[name=playerName]", "Dustin");
await page.fill("#form-login input[name=pin]", "1234");
await page.click("#form-login button[type=submit]");
await page.waitForSelector(".mapwrap svg", { timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/harness/shot-game.png", fullPage: true });

// 3. click own capital -> order builder appears
const cap = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("wastelords.session"));
  return fetch(`/api/state?code=${s.code}&token=${s.token}`).then((r) => r.json()).then((d) => d.you.capital);
});
await page.click(`polygon[data-tid=${cap}]`);
await page.waitForSelector("#b-march", { timeout: 5000 });
await page.click("#b-march");
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/harness/shot-orders.png", fullPage: false });

console.log("UI OK; errors:", errors.length ? errors : "none");
await browser.close();
