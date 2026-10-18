// Kansen in het rapport: gevuld voorbeeldhuishouden.
const { chromium } = require("playwright");
const { start } = require("./hulp");
const path = require("path");
const { opslag } = require("./voorbeeld.js");
const url = "file://" + path.join(__dirname, "..", "index.html");
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const ctx = await browser.newContext({ viewport: { width: 411, height: 900 }, timezoneId: "Europe/Amsterdam", locale: "nl-NL" });
  await ctx.addInitScript(o => { if (!sessionStorage.getItem("gezaaid")) { Object.keys(o).forEach(k => localStorage.setItem(k, o[k])); sessionStorage.setItem("gezaaid", "1"); } }, opslag);
  const page = await ctx.newPage(); const pe = [];
  page.on("pageerror", e => pe.push(e.message)); page.on("dialog", d => d.accept());
  await start(page, url, ".kop");
  await page.keyboard.press("Escape");
  ok("dashboard toont kansenkaart", await page.locator("[data-kansen]").count() >= 1);
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="rapport"]'); await page.waitForTimeout(200);
  if (await page.locator("[role=dialog]").count()) await page.keyboard.press("Escape");
  const t = await page.textContent('[data-rp="kansen"]');
  console.log(t.replace(/\s+/g, " ").slice(0, 1800));
  ok("rapport heeft kansensectie", t.length > 50);
  ok("lasten: energie genoemd", /Gas, elektriciteit/.test(t));
  ok("rente: spaarrekening zonder rente of verschil gemeld", /rente/i.test(t));
  ok("geen pageerror", pe.length === 0, pe.join("|"));
  await browser.close(); console.log(fouten ? "FOUTEN" : "Alles OK");
})();
