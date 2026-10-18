const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const { opslag } = require("./voorbeeld.js");
const url = "file://" + path.join(__dirname, "..", "index.html");
const uit = process.argv[2] || "/tmp/bl-test";
fs.mkdirSync(uit, { recursive: true });
const MENUS = ["dashboard", "inkomen", "aanvulling", "pensioen", "lasten", "vermogen", "grote", "fiscaal", "advies", "rapport"];
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  for (const breedte of [411, 360]) {
    const ctx = await browser.newContext({ viewport: { width: breedte, height: 900 }, timezoneId: "Europe/Amsterdam", locale: "nl-NL" });
    await ctx.addInitScript(o => { if (!sessionStorage.getItem("gezaaid")) { Object.keys(o).forEach(k => localStorage.setItem(k, o[k])); sessionStorage.setItem("gezaaid", "1"); } }, opslag);
    const page = await ctx.newPage();
    const pe = [], ce = [];
    page.on("pageerror", e => pe.push(e.message)); page.on("console", m => { if (m.type() === "error") ce.push(m.text()); }); page.on("dialog", d => d.accept());
    await page.goto(url); await page.waitForSelector(".kop");
    for (const id of MENUS) {
      await page.click('[data-knop="menu"]'); await page.click(`[data-menu="${id}"]`); await page.waitForTimeout(150);
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      ok(`[${breedte}] ${id} (gevuld): geen horizontale scroll`, sw[0] <= sw[1], sw.join("/"));
      if (breedte === 411) await page.screenshot({ path: `${uit}/${id}.png`, fullPage: true });
    }
    // Advies-tabs
    await page.click('[data-knop="menu"]'); await page.click('[data-menu="advies"]');
    for (const t of ["uitgangspunten", "bijbeleggen", "bestaand", "portefeuille", "markt", "fondsen"]) {
      await page.click(`[data-tab="${t}"]`); await page.waitForTimeout(60);
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      ok(`[${breedte}] advies/${t}: geen horizontale scroll`, sw[0] <= sw[1], sw.join("/"));
      if (breedte === 411) await page.screenshot({ path: `${uit}/advies-${t}.png`, fullPage: true });
    }
    // Uitvalscherm
    await page.click('[data-knop="menu"]'); await page.click('[data-menu="vermogen"]');
    await page.click('[data-klik="sparen3"]'); await page.waitForSelector("[role=dialog]");
    const modalTekst = await page.textContent("[role=dialog]");
    ok(`[${breedte}] uitvalscherm toont namen`, /Netto inkomen|Vaste lasten/.test(modalTekst), modalTekst.slice(0, 160));
    if (breedte === 411) await page.screenshot({ path: `${uit}/uitval.png` });
    await page.keyboard.press("Escape");
    // Help, Actualiseren, Cijfers bijwerken (bestand)
    await page.click('[data-knop="help"]'); await page.fill('[data-veld="help-zoek"]', "toeslag");
    ok(`[${breedte}] help vindt toeslagen`, /Toeslagen en kinderbijslag/.test(await page.textContent("[role=dialog]")));
    await page.keyboard.press("Escape");
    await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
    await page.click('[data-knop="actualiseren"]'); await page.waitForSelector("[role=dialog]");
    ok(`[${breedte}] actualiseren opent`, /Actualiseren/.test(await page.textContent("[role=dialog]")));
    await page.click('[data-knop="actualiseer-klaar"]'); await page.keyboard.press("Escape");
    await page.setInputFiles('[data-veld="cijfers-bestand"]', require("path").join(__dirname, "..", "cijfers.json"));
    await page.waitForSelector('[data-cijfers-melding]');
    ok(`[${breedte}] cijfers bijwerken uit bestand`, /Bijgewerkt met cijfers van 18-10-2026/.test(await page.textContent('[data-cijfers-melding]')), await page.textContent('[data-cijfers-melding]'));
    ok(`[${breedte}] geen pageerror`, pe.length === 0, pe.join("|")); ok(`[${breedte}] geen console-fouten`, ce.length === 0, ce.join("|"));
    if (breedte === 411) {
      await page.click('[data-knop="menu"]'); await page.click('[data-menu="rapport"]'); await page.waitForTimeout(150);
      await page.emulateMedia({ media: "print" });
      await page.pdf({ path: `${uit}/rapport.pdf`, format: "A4", printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true });
      await page.emulateMedia({ media: "screen" });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(fouten ? "FOUTEN: " + fouten : "Alles OK");
})();
