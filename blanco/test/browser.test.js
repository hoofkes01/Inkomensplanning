// Browsertest met Playwright (Chromium, tijdzone Europe/Amsterdam).
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
const MENUS = ["dashboard", "inkomen", "aanvulling", "pensioen", "lasten", "vermogen", "grote", "fiscaal", "advies", "rapport"];
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  for (const breedte of [411, 360]) {
    const ctx = await browser.newContext({ viewport: { width: breedte, height: 800 }, timezoneId: "Europe/Amsterdam", locale: "nl-NL" });
    const page = await ctx.newPage();
    const pageErrors = [], consoleErr = [];
    page.on("pageerror", e => pageErrors.push(e.message));
    page.on("console", m => { if (m.type() === "error") consoleErr.push(m.text()); });
    page.on("dialog", d => d.accept());
    await page.goto(url);
    await page.waitForSelector(".kop");
    // Verse start: intake van Dashboard opent automatisch
    ok(`[${breedte}] opent op Dashboard`, (await page.textContent(".kop small")).startsWith("Dashboard"));
    ok(`[${breedte}] versiestempel in kop`, /App-versie \d{2}-\d{2}-\d{4} · \d{2}:\d{2}/.test(await page.textContent(".kop small")));
    ok(`[${breedte}] intake opent automatisch`, await page.locator("[role=dialog]").count() === 1);
    await page.keyboard.press("Escape");
    for (const id of MENUS) {
      await page.click('[data-knop="menu"]');
      await page.click(`[data-menu="${id}"]`);
      await page.waitForTimeout(80);
      // eerste bezoek: intake opent; sluit hem
      if (await page.locator("[role=dialog]").count()) await page.keyboard.press("Escape");
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      ok(`[${breedte}] ${id}: geen horizontale scroll`, sw[0] <= sw[1], sw.join("/"));
      ok(`[${breedte}] ${id}: menu gesloten na één tik`, await page.locator(".menulaag").count() === 0);
    }
    ok(`[${breedte}] geen pageerror`, pageErrors.length === 0, pageErrors.join(" | "));
    ok(`[${breedte}] geen console-fouten`, consoleErr.length === 0, consoleErr.join(" | "));
    await ctx.close();
  }
  await browser.close();
  console.log(fouten ? "FOUTEN: " + fouten : "Alles OK");
})();
