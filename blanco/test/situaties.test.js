// Loopt de volledige intake door voor verschillende huishoudens en controleert dat alles doorloopt zonder fouten.
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
const SITUATIES = [
  { naam: "alleenstaande man, huur, geen auto, geen kinderen", type: "man", geb: ["15-09-1990"], woning: "huur", eigen: "0", lease: "0", kinderen: 0, buffer: "5000", producten: [] },
  { naam: "alleenstaande vrouw, koop, 1 eigen auto, 2 kinderen (1 met beperking)", type: "vrouw", geb: ["03-04-1982"], woning: "koop", eigen: "1", lease: "0", kinderen: 2, kinderGeb: ["10-03-2015", "01-06-2019"], beperking: 2, buffer: "10000", producten: ["pensioen"] },
  { naam: "stel man+vrouw, koop, 2 eigen + 1 lease, beleggen en deposito's", type: "man+vrouw", geb: ["15-09-1966", "09-11-1964"], woning: "koop", eigen: "2", lease: "1", kinderen: 0, buffer: "15000", producten: ["deposito", "beleggen", "pensioen", "aanvulling"] },
  { naam: "stel man+man, huur, deelauto, kind", type: "man+man", geb: ["12-02-1975", "30-08-1978"], woning: "huur", eigen: "0", lease: "0", deel: true, kinderen: 1, kinderGeb: ["05-05-2020"], buffer: "8000", producten: ["beleggen"] },
  { naam: "gepensioneerd stel vrouw+vrouw, AOW al ingegaan, geen woning", type: "vrouw+vrouw", geb: ["01-03-1955", "20-07-1957"], woning: "geen", eigen: "0", lease: "0", kinderen: 0, buffer: "20000", producten: ["deposito", "pensioen"] }
];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  for (const S of SITUATIES) {
    const ctx = await browser.newContext({ viewport: { width: 411, height: 900 }, timezoneId: "Europe/Amsterdam" });
    const page = await ctx.newPage(); const pe = [];
    page.on("pageerror", e => pe.push(e.message)); page.on("dialog", d => d.accept());
    await page.goto(url); await page.waitForSelector("[role=dialog]");
    const dlg = "[role=dialog] ";
    const v = (sel, w) => page.fill(`${dlg}[data-veld="${sel}"]`, w);
    const volgende = () => page.click('[data-knop="intake-volgende"]');
    await page.check(`${dlg}input[type=checkbox]`); await volgende();
    await page.check(`${dlg}[data-huishouden="${S.type}"]`); await volgende();
    await v("geboorteA", S.geb[0]); if (S.geb[1]) await v("geboorteB", S.geb[1]); await volgende();
    await volgende(); await volgende(); // AOW, werk
    await page.check(`${dlg}[data-woning="${S.woning}"]`); await volgende();
    await page.selectOption(`${dlg}[data-veld="auto-eigen"]`, S.eigen); await page.selectOption(`${dlg}[data-veld="auto-lease"]`, S.lease);
    if (S.deel) await page.check(`${dlg}input[type=checkbox]`); await volgende();
    if (S.kinderen) {
      await v("kinderen", String(S.kinderen));
      for (let i = 0; i < S.kinderen; i++) await v("kind-geboorte" + (i + 1), S.kinderGeb[i]);
      if (S.beperking) await page.check(`${dlg}[data-vink="beperking${S.beperking}"]`);
    }
    await volgende();
    await v("minimum", S.buffer); await volgende();
    for (const k of S.producten) { const i = ["deposito", "beleggen", "pensioen", "aanvulling"].indexOf(k); await page.check(`${dlg}input[type=checkbox] >> nth=${i}`); }
    await volgende();
    await page.waitForSelector("[role=dialog]", { state: "detached" });
    // alle overige intakes doorlopen (zonder gegevens: overslaan/volgende)
    let rondes = 0;
    while (rondes++ < 12) {
      const volg = await page.evaluate(() => { const b = document.querySelector('[data-knop="intake-volgende-menu"]'); return !!b; });
      if (!volg) break;
      await page.click('[data-knop="intake-volgende-menu"]');
      await page.waitForSelector("[role=dialog]", { timeout: 3000 }).catch(() => {});
      for (let t = 0; t < 20 && await page.locator("[role=dialog]").count(); t++) {
        if (await page.locator(`${dlg}[data-profiel="neutraal"]`).count()) { await page.check(`${dlg}[data-profiel="neutraal"]`); await page.selectOption(`${dlg}[data-veld="broker"]`, "DEGIRO"); }
        if (await page.locator('[data-knop="intake-overslaan"]').count()) await page.click('[data-knop="intake-overslaan"]'); else await page.click('[data-knop="intake-volgende"]');
        await page.waitForTimeout(40);
      }
      await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
    }
    await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
    const dash = await page.textContent("main");
    const m = dash.match(/Intake: (\d+) van (\d+) menu's voltooid/);
    ok(`${S.naam}: alle intakes doorlopen`, /Alle intakes zijn voltooid/.test(dash) || (m && m[1] === m[2]), m ? m[0] : "geen voortgang");
    // alle menu's openen zonder fout
    await page.click('[data-knop="menu"]'); await page.waitForSelector('[data-menu]');
    const menus = await page.locator('[data-menu]').evaluateAll(els => els.map(e => e.dataset.menu));
    await page.click('[data-knop="menu"]');
    for (const id of menus) {
      await page.click('[data-knop="menu"]'); await page.click(`[data-menu="${id}"]`); await page.waitForTimeout(60);
      if (await page.locator("[role=dialog]").count()) await page.keyboard.press("Escape");
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      if (sw[0] > sw[1]) ok(`${S.naam}: ${id} geen horizontale scroll`, false, sw.join("/"));
      if (await page.locator('.kaart.fout[role=alert]').count()) ok(`${S.naam}: ${id} toont een schermfout`, false);
    }
    // verwachte menu's per situatie
    ok(`${S.naam}: menu klopt met keuzes`, menus.includes("advies") === S.producten.includes("beleggen") && menus.includes("aanvulling") === S.producten.includes("aanvulling"), menus.join(","));
    // lasten passen bij de keuzes
    await page.click('[data-knop="menu"]'); await page.click('[data-menu="lasten"]');
    const l = await page.textContent("main");
    ok(`${S.naam}: lasten passen bij woning`, S.woning === "huur" ? /Kale huur/.test(l) && !/OZB/.test(l) : S.woning === "koop" ? /OZB/.test(l) && !/Kale huur/.test(l) : /Bijdrage woonkosten/.test(l) && !/Kale huur/.test(l));
    ok(`${S.naam}: lasten passen bij auto`, (S.eigen === "0" && S.lease === "0") ? !/Autoverzekering/.test(l) : /Brandstof of laden/.test(l));
    // rapport
    await page.click('[data-knop="menu"]'); await page.click('[data-menu="rapport"]'); await page.waitForTimeout(150);
    if (await page.locator("[role=dialog]").count()) await page.keyboard.press("Escape");
    ok(`${S.naam}: rapport toont onderdelen`, /Wat valt op/.test(await page.textContent("main")));
    ok(`${S.naam}: geen pageerror`, pe.length === 0, pe.join(" | "));
    await ctx.close();
  }
  await browser.close(); console.log(fouten ? "FOUTEN: " + fouten : "Alles OK");
})();
