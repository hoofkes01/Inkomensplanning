// Bij een laag inkomen meldt de app per toeslag: waarschijnlijk recht, met de plek om aan te vragen.
const { chromium } = require("playwright");
const { start: startApp, openKlant } = require("./hulp");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
async function start(browser, brutoMaand) {
  const ctx = await browser.newContext({ viewport: { width: 411, height: 900 }, timezoneId: "Europe/Amsterdam" });
  const page = await ctx.newPage(); const pe = [];
  page.on("pageerror", e => pe.push(e.message)); page.on("dialog", d => d.accept());
  await startApp(page, url, "[role=dialog]");
  const dlg = "[role=dialog] ", v = (s, w) => page.fill(`${dlg}[data-veld="${s}"]`, w), volgende = () => page.click('[data-knop="intake-volgende"]');
  await page.check(`${dlg}input[type=checkbox]`); await volgende();
  await page.check(`${dlg}[data-huishouden="vrouw"]`); await volgende();
  await v("geboorteA", "15-09-1990"); await volgende(); await volgende(); await volgende();
  await page.check(`${dlg}[data-woning="huur"]`); await volgende();
  await page.selectOption(`${dlg}[data-veld="auto-eigen"]`, "0"); await page.selectOption(`${dlg}[data-veld="auto-lease"]`, "0"); await volgende();
  await v("kinderen", "1"); await v("kind-geboorte1", "10-03-2019"); await page.check(`${dlg}[data-kind="1"] input[type=checkbox] >> nth=0`); await volgende();
  await v("minimum", "2000"); await volgende(); await volgende();
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="inkomen"]'); await page.waitForSelector("[role=dialog]");
  await page.selectOption(`${dlg}[data-veld="bron-soort-kies"]`, "loon"); await page.click(`${dlg}[data-knop="voeg-bron"]`);
  await v("bron-bruto", String(brutoMaand));
  await volgende();
  if (await page.locator(`${dlg}[data-intake-stap="werken"]`).count()) await volgende();
  await page.waitForSelector(`${dlg}[data-toeslagvragen]`);
  return { page, ctx, pe, dlg };
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  // Inkomen 10.000 per jaar (bruto 833 per maand)
  let s = await start(browser, 833);
  const kaart = code => s.page.locator(`${s.dlg}[data-toeslagvraag="${code}"]`);
  for (const code of ["zorgtoeslag", "huurtoeslag", "kgb", "kopvang"]) {
    ok(`10.000 per jaar: waarschijnlijk recht op ${code}`, await s.page.locator(`${s.dlg}[data-sterkte="${code}-waarschijnlijk"]`).count() === 1);
  }
  const tekst = await s.page.textContent(`${s.dlg}[data-toeslagvraag="zorgtoeslag"]`);
  ok("melding noemt de plek om aan te vragen (toeslagen.nl)", /Waarschijnlijk recht op zorgtoeslag/.test(tekst) && /toeslagen\.nl/.test(tekst), tekst.slice(0, 160));
  ok("link naar toeslagen.nl aanwezig", await s.page.locator(`${s.dlg}[data-toeslagvraag="zorgtoeslag"] a[href="https://toeslagen.nl"]`).count() === 1);
  await s.page.click('[data-knop="intake-overslaan"]');
  await s.page.waitForSelector("[role=dialog]", { state: "detached" }).catch(() => {});
  while (await s.page.locator("[role=dialog]").count()) await s.page.keyboard.press("Escape");
  await s.page.click('[data-knop="menu"]'); await s.page.click('[data-menu="dashboard"]');
  const dash = await s.page.textContent("#aandacht");
  ok("dashboard: waarschijnlijk recht op zorgtoeslag, met aanvraagplek", /heb je waarschijnlijk recht op zorgtoeslag\. Vraag hem aan via Mijn toeslagen op toeslagen\.nl/.test(dash), dash.slice(0, 200));
  ok("dashboard: badge 'Waarschijnlijk recht' en link", /Waarschijnlijk recht/.test(dash) && await s.page.locator('#aandacht a[href="https://toeslagen.nl"]').count() >= 1);
  // 'Nee, nog niet aangevraagd' laat de melding staan; 'geen recht onderzocht' haalt hem weg
  await s.page.click('[data-knop="menu"]'); await s.page.click('[data-menu="inkomen"]');
  await s.page.check('[data-toeslag-antwoord="zorgtoeslag-nog_niet"]');
  await s.page.click('[data-knop="menu"]'); await s.page.click('[data-menu="dashboard"]');
  ok("na 'nog niet aangevraagd' blijft de melding", /waarschijnlijk recht op zorgtoeslag/.test(await s.page.textContent("#aandacht")));
  await s.page.click('[data-knop="menu"]'); await s.page.click('[data-menu="inkomen"]');
  await s.page.check('[data-toeslag-antwoord="zorgtoeslag-geen"]');
  await s.page.click('[data-knop="menu"]'); await s.page.click('[data-menu="dashboard"]');
  ok("na 'geen recht onderzocht' verdwijnt de melding", !/recht op zorgtoeslag/.test(await s.page.textContent("#aandacht")));
  ok("geen pageerror", s.pe.length === 0, s.pe.join("|"));
  await s.ctx.close();
  // Inkomen 70.000 per jaar: geen zorgtoeslag, wel 'waarschuwing geen recht'
  s = await start(browser, 5833);
  ok("70.000 per jaar: geen vraag over zorgtoeslag", await s.page.locator(`${s.dlg}[data-toeslagvraag="zorgtoeslag"]`).count() === 0);
  ok("70.000 per jaar: uitleg waarom geen recht op zorgtoeslag", /Zorgtoeslag: je inkomen/.test(await s.page.textContent(`${s.dlg}[data-toeslagvragen]`)));
  await s.ctx.close();
  await browser.close(); console.log(fouten ? "FOUTEN" : "Alles OK");
})();
