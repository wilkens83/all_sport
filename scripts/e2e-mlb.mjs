// Lightweight Slice-2 browser flow check (run locally, not in CI):
//   /mlb -> click game -> game page -> click player -> player page
// plus 404s, console errors, and a mobile-width render.
// Usage: BASE_URL=http://localhost:PORT node scripts/e2e-mlb.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3950";
const EXE =
  process.env.PW_CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const problems = [];
function check(cond, msg) {
  if (!cond) problems.push(msg);
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
}

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext();
const consoleErrors = [];
ctx.on("weberror", (e) => consoleErrors.push(String(e.error())));

const page = await ctx.newPage();
page.on("console", (m) => {
  // Ignore favicon resource-fetch noise (not an application/JS error).
  if (m.type() === "error" && !/favicon/i.test(m.text())) {
    consoleErrors.push(m.text());
  }
});

// 1. /mlb
let r = await page.goto(`${BASE}/mlb`, { waitUntil: "networkidle" });
check(r.status() === 200, "/mlb returns 200");
const gameCards = await page.$$("a.game-card");
check(gameCards.length > 0, `/mlb shows game cards (${gameCards.length})`);

// 2. click a game
await gameCards[0].click();
await page.waitForLoadState("networkidle");
check(/\/mlb\/games\//.test(page.url()), `game page opened (${page.url()})`);
const hasProbables = await page.$("text=Probable Pitchers");
check(!!hasProbables, "game page shows Probable Pitchers");
const rosterLinks = await page.$$('a.roster-item, a[href^="/mlb/players/"]');
check(
  rosterLinks.length > 0,
  `game page has clickable players (${rosterLinks.length})`,
);

// 3. click a player
await rosterLinks[0].click();
await page.waitForLoadState("networkidle");
check(
  /\/mlb\/players\//.test(page.url()),
  `player page opened (${page.url()})`,
);
const hasRecent = await page.$("text=/Recent (Batting|Pitching)/");
check(!!hasRecent, "player page shows a Recent section");

// 4. mobile viewport render of /mlb (still positive flow)
await page.setViewportSize({ width: 390, height: 844 });
r = await page.goto(`${BASE}/mlb`, { waitUntil: "networkidle" });
check(r.status() === 200, "/mlb renders at mobile width (390px)");

// Assert a clean console on the positive flow BEFORE deliberately hitting 404s
// (a 404 navigation legitimately logs a "failed to load resource" console error).
check(
  consoleErrors.length === 0,
  `no console/page errors (${consoleErrors.length})`,
);
if (consoleErrors.length) console.log("  errors:", consoleErrors.slice(0, 5));

// 5. 404s (these intentionally produce 404 responses)
await page.setViewportSize({ width: 1100, height: 900 });
const p404 = await page.goto(
  `${BASE}/mlb/players/00000000-0000-4000-8000-000000000000`,
);
check(p404.status() === 404, "unknown player -> 404");
const g404 = await page.goto(
  `${BASE}/mlb/games/00000000-0000-4000-8000-000000000000`,
);
check(g404.status() === 404, "unknown game -> 404");

await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll e2e checks passed");
