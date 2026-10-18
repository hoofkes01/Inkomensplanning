const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  const ctx = await browser.newContext({ viewport: { width: 411, height: 900 }, timezoneId: "Europe/Amsterdam" });
  const page = await ctx.newPage(); const pe = [];
  page.on("pageerror", e => pe.push(e.message)); page.on("dialog", d => d.accept());
  await page.goto(url); await page.waitForSelector("[role=dialog]");
  const v = (sel, w) => page.fill(`[role=dialog] [data-veld="${sel}"]`, w);
  const volgende = () => page.click('[data-knop="intake-volgende"]');
  // Dashboard-intake
  await v("naamA", "Anna"); await page.uncheck('[role=dialog] input[type=checkbox]'); // geen partner
  await v("geboorteA", "1966-09-15"); await volgende();
  ok("AOW-stap toont AOW-datum", /15-12-2033/.test(await page.textContent("[role=dialog]")));
  await volgende(); await v("peildatum", "2026-10-18"); await volgende();
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  ok("Dashboard-intake voltooid: 1 van 10", /1 van 10/.test(await page.textContent("main")));
  // Inkomen-intake met validatie
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="inkomen"]');
  await page.waitForSelector("[role=dialog]");
  await page.click(`[role=dialog] [data-knop="voeg-bron"]`);
  await volgende();
  ok("validatie: naam verplicht", /naam/i.test(await page.textContent('[role=alert]')));
  await v("bron-naam", "Salaris"); await v("bron-bruto", "5.000"); await v("bron-netto", "3300"); await v("bron-einde", "2027-01-01"); await volgende();
  ok("stap B zonder partner", /zonder partner/.test(await page.textContent("[role=dialog]")));
  await page.click(`[data-knop="intake-overslaan"]`);
  await page.click('[data-knop="intake-volgende"]');
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  const t = await page.textContent("main");
  ok("Inkomen toont netto 3.300", /€ 3\.300/.test(t));
  // Vermogen: negatief bedrag wordt tegengehouden
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="vermogen"]');
  await page.waitForSelector("[role=dialog]");
  await v("spaar", "-500"); 
  ok("min-teken wordt genegeerd", (await page.inputValue('[role=dialog] [data-veld="spaar"]')) === "500");
  await v("spaar", "40.000"); await v("spaarrente", "2,5");
  await volgende(); await page.click(`[role=dialog] [data-knop="voeg-deposito"]`); await volgende();
  ok("deposito validatie", /naam|bedrag|startdatum/i.test(await page.textContent('[role=alert]')));
  await page.click(`[data-knop="intake-overslaan"]`); await page.click(`[data-knop="intake-overslaan"]`); await page.click(`[data-knop="intake-overslaan"]`); await page.click('[data-knop="intake-volgende"]');
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  ok("Vermogen toont spaargeld", /€ 40\.000/.test(await page.textContent("main")));
  // Back-up en terugzetten
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-knop="backup-opslaan"]')]);
  const pad = "/tmp/backup.json"; await dl.saveAs(pad);
  const b = JSON.parse(require("fs").readFileSync(pad, "utf8"));
  ok("back-up bevat gegevens en versie", b.app === "inkomensplanning-blanco" && /\d{2}-\d{2}-\d{4}/.test(b.appVersie) && Object.keys(b.gegevens).length > 5);
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
  await page.click('details summary'); 
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.waitForSelector(".kop");
  await page.setInputFiles('[data-veld="backup-bestand"]', pad);
  await page.waitForLoadState("load"); await page.waitForTimeout(1200);
  await page.waitForSelector(".kop");
  ok("terugzetten herstelt gegevens", (await page.evaluate(() => JSON.parse(localStorage.getItem("inkomensplanning_verm")).spaar)) === 40000);
  ok("geen pageerror", pe.length === 0, pe.join("|"));
  await browser.close(); console.log(fouten ? "FOUTEN" : "Alles OK");
})();
