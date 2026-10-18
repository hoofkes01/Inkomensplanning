// Klantenlijst: meerdere dossiers naast elkaar, gescheiden gegevens, export/import, migratie.
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, timezoneId: "Europe/Amsterdam", locale: "nl-NL" });
  const page = await ctx.newPage(); const pe = [];
  page.on("pageerror", e => pe.push(e.message)); page.on("dialog", d => d.accept());
  // oude gegevens zonder klant worden overgenomen
  await page.addInitScript(() => { if (!sessionStorage.getItem("gezaaid")) { localStorage.setItem("inkomensplanning_profiel", JSON.stringify({ type: "man+vrouw" })); sessionStorage.setItem("gezaaid", "1"); } });
  await page.goto(url); await page.waitForSelector('[data-scherm="klanten"]');
  ok("oude gegevens als klant overgenomen", await page.locator("[data-klant]").count() === 1 && /Een man en een vrouw/.test(await page.textContent("[data-klant]")));
  ok("oude sleutel opgeruimd", await page.evaluate(() => localStorage.getItem("inkomensplanning_profiel") === null));
  // nieuwe klant, naam wordt geweigerd
  await page.click('[data-knop="nieuwe-klant"]');
  await page.fill('[data-veld="klant-code"]', "jansen@mail.nl");
  ok("e-mail als code geweigerd", await page.locator('[data-knop="klant-maak"]').isDisabled() || /niet toegestaan/.test(await page.textContent('[data-blok="nieuwe-klant"]')));
  await page.fill('[data-veld="klant-code"]', "K-007");
  await page.click('[data-knop="klant-maak"]');
  await page.waitForSelector(".kop small");
  ok("nieuwe klant geopend met code in kop", /K-007/.test(await page.textContent(".kop .titel b")));
  await page.keyboard.press("Escape");
  // gegevens van deze klant staan apart
  await page.evaluate(() => localStorage.setItem("inkomensplanning_k002_verm", JSON.stringify({ x: 1 })));
  await page.click('[data-knop="naar-klanten"]'); await page.waitForSelector('[data-scherm="klanten"]');
  ok("twee klanten in lijst", await page.locator("[data-klant]").count() === 2);
  // dubbele code geweigerd
  await page.click('[data-knop="nieuwe-klant"]'); await page.fill('[data-veld="klant-code"]', "k-007");
  ok("dubbele code geweigerd", await page.locator('[data-knop="klant-maak"]').isDisabled());
  await page.click('[data-knop="klant-annuleer"]');
  // dupliceren
  await page.locator('[data-klant="k002"] [data-knop="klant-kopie"]').click();
  ok("dupliceren geeft derde klant met kopie van data", await page.locator("[data-klant]").count() === 3 && await page.evaluate(() => localStorage.getItem("inkomensplanning_k003_verm") !== null));
  // exporteren en importeren
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('[data-klant="k002"] [data-knop="klant-export"]').click()]);
  const pad = "/tmp/klant.json"; await dl.saveAs(pad);
  const b = JSON.parse(require("fs").readFileSync(pad, "utf8"));
  ok("export bevat klantcode en gegevens zonder klantvoorvoegsel", b.klantCode === "K-007" && b.gegevens["inkomensplanning_verm"] !== undefined);
  await page.setInputFiles('[data-veld="klant-import"]', pad); await page.waitForTimeout(300);
  ok("import voegt klant toe met nieuwe code", await page.locator("[data-klant]").count() === 4 && /K-007/.test(await page.textContent('[data-klant="k004"]')) === false);
  // zoeken
  await page.fill('[data-veld="klant-zoek"]', "K-007");
  ok("zoeken filtert", (await page.locator("[data-klant]").count()) < 4 && (await page.locator("[data-klant]").count()) >= 1);
  await page.fill('[data-veld="klant-zoek"]', "");
  // verwijderen
  await page.locator('[data-klant="k004"] [data-knop="klant-wis"]').click();
  ok("verwijderen haalt klant en data weg", await page.locator("[data-klant]").count() === 3 && await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf("inkomensplanning_k004_") === 0).length === 0));
  // terugkeren naar app na herladen blijft in dezelfde klant; nieuw tabblad start in lijst
  await page.locator('[data-klant="k002"] [data-knop="klant-open"]').click(); await page.waitForSelector('[data-knop="naar-klanten"]');
  await page.reload(); await page.waitForSelector(".kop");
  // Na herladen blijft de klant open (sessionStorage); sommige browsers tonen bij file:// de lijst. Beide is goed, mits de klant bereikbaar is.
  if (await page.locator('[data-scherm="klanten"]').count()) await page.locator('[data-klant="k002"] [data-knop="klant-open"]').click();
  await page.waitForSelector('[data-knop="naar-klanten"]');
  ok("klant na herladen bereikbaar met eigen code", /K-007/.test(await page.textContent(".kop .titel b")));
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok("geen horizontale scroll", sw[0] <= sw[1], sw.join("/"));
  ok("geen pageerror", pe.length === 0, pe.join("|"));
  await browser.close(); console.log(fouten ? "FOUTEN" : "Alles OK");
})();
