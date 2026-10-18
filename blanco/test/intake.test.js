const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
let fouten = 0;
const ok = (n, c, x) => { console.log((c ? "OK   " : "FOUT ") + n + (x !== undefined ? "  -> " + x : "")); if (!c) { fouten++; process.exitCode = 1; } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  const ctx = await browser.newContext({ viewport: { width: 411, height: 900 }, timezoneId: "Europe/Amsterdam", acceptDownloads: true });
  const page = await ctx.newPage(); const pe = [];
  page.on("pageerror", e => pe.push(e.message)); page.on("dialog", d => d.accept());
  await page.goto(url); await page.waitForSelector("[role=dialog]");
  const dlg = "[role=dialog] ";
  const v = (sel, w) => page.fill(`${dlg}[data-veld="${sel}"]`, w);
  const volgende = () => page.click('[data-knop="intake-volgende"]');
  const tekst = () => page.textContent("[role=dialog]");
  // Algemene intake
  await volgende();
  ok("zonder akkoord geen verder", /Bevestig dat je geen persoonsgegevens/.test(await tekst()));
  await page.check(`${dlg}input[type=checkbox]`); await volgende();
  await volgende(); ok("huishouden is verplicht", /Kies de samenstelling/.test(await tekst()));
  await page.check(`${dlg}[data-huishouden="man+man"]`); await volgende();
  await v("geboorteA", "01-01-2015"); await v("geboorteB", "15-09-1966"); await volgende();
  ok("jonger dan 18 wordt geweigerd", /jonger dan 18/.test(await tekst()));
  await v("geboorteA", "0911"); ok("onvolledige datum geeft melding", /dag-maand-jaar/.test(await tekst())); await v("geboorteA", "09-11-1964"); await volgende();
  ok("AOW-stap toont datums", /09-02-2032/.test(await tekst()) && /15-12-2033/.test(await tekst()), (await tekst()).slice(0, 200));
  await volgende();
  ok("werkstap noemt Man 1 en Man 2", /Man 1/.test(await tekst()) && /Man 2/.test(await tekst()));
  await page.check(`${dlg}input[type=checkbox] >> nth=0`); // Man 1: loondienst
  await volgende();
  await volgende(); ok("woning is verplicht", /Kies je woonsituatie/.test(await tekst()));
  await page.check(`${dlg}[data-woning="huur"]`); await volgende();
  await volgende(); ok("auto-aantal is verplicht", /aantal eigen auto/.test(await tekst()));
  await page.selectOption(`${dlg}[data-veld="auto-eigen"]`, "0"); await page.selectOption(`${dlg}[data-veld="auto-lease"]`, "0"); await volgende();
  await v("kinderen", "1");
  await volgende(); ok("geboortedatum kind is verplicht", /geboortedatum van kind 1/.test(await tekst()));
  await v("kind-geboorte1", "10-03-2018");
  ok("kinderbijslag is meteen zichtbaar bij het kind (362 per kwartaal)", /Kinderbijslag/.test(await tekst()) && /€ 362/.test(await tekst()) && await page.locator(`${dlg}[data-kb-modus="auto"]`).isChecked()); await page.check(`${dlg}[data-kind="1"] input[type=checkbox] >> nth=0`);
  ok("beperking-vink aanwezig bij het kind", await page.locator(`${dlg}[data-vink="beperking1"]`).count() === 1);
  await volgende(); // kinderopvang
  await volgende();
  ok("buffer is verplicht", /minimale buffer/i.test(await tekst()));
  await v("minimum", "12.500"); await volgende();
  ok("deposito's en beleggen zijn niet vooringevuld", !(await page.isChecked(`${dlg}input[type=checkbox] >> nth=0`)) && !(await page.isChecked(`${dlg}input[type=checkbox] >> nth=1`)));
  await volgende();
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  ok("Dashboard-intake voltooid: 1 van 7", /1 van 7/.test(await page.textContent("main")), (await page.textContent("main")).match(/Intake: \d van \d/));
  await page.click('[data-knop="menu"]');
  const menuTekst = await page.textContent(".menulijst");
  ok("geen advies- of aanvullingsmenu zonder keuze", !/Beleggingsadvies|Toevoeging inkomen/.test(menuTekst));
  await page.click('[data-menu="inkomen"]'); await page.waitForSelector("[role=dialog]");
  // Inkomen: huurtoeslag aanwezig voor Man 1, niet voor Man 2; loon voor Man 1
  const opties = await page.locator(`${dlg}[data-veld="bron-soort-kies"] option`).allTextContents();
  ok("huurtoeslag en kinderbijslag worden aangeboden", opties.some(o => /Huurtoeslag/.test(o)) && !opties.some(o => /Kinderbijslag/.test(o)) && opties.some(o => /Kinderopvangtoeslag/.test(o)), opties.join("|"));
  await page.selectOption(`${dlg}[data-veld="bron-soort-kies"]`, "loon"); await page.click(`${dlg}[data-knop="voeg-bron"]`);
  await v("bron-bruto", "4000"); await v("bron-netto", "2900");
  await page.selectOption(`${dlg}[data-veld="bron-soort-kies"]`, "huurtoeslag"); await page.click(`${dlg}[data-knop="voeg-bron"]`);
  await page.locator(`${dlg}[data-veld="bron-netto"]`).last().fill("150");
  await volgende();
  const optB = await page.locator(`${dlg}[data-veld="bron-soort-kies"] option`).allTextContents();
  ok("Man 2 krijgt geen huurtoeslag", !optB.some(o => /Huurtoeslag/.test(o)));
  await page.click('[data-knop="intake-overslaan"]'); // overslaan Man 2
  await page.waitForSelector(`${dlg}[data-intake-stap="werken"]`).catch(() => {});
  // werken-stap en toeslagen-stap
  for (let i = 0; i < 6 && await page.locator("[role=dialog]").count(); i++) {
    if (await page.locator(`${dlg}[data-toeslagvragen]`).count()) {
      ok("toeslagenstap vraagt actief naar zorgtoeslag, kindgebonden budget en kinderopvangtoeslag", await page.locator(`${dlg}[data-toeslagvraag="zorgtoeslag"]`).count() === 1 && await page.locator(`${dlg}[data-toeslagvraag="kgb"]`).count() === 1 && await page.locator(`${dlg}[data-toeslagvraag="kopvang"]`).count() === 1);
      ok("onderzoeksmelding per toeslag in de intake", await page.locator(`${dlg}[data-onderzoek="zorgtoeslag"]`).count() === 1);
      await volgende(); ok("onbeantwoorde toeslagvraag blokkeert", /Beantwoord de vraag over/.test(await tekst()));
      ok("huurtoeslag staat al als ja (zelf ingevoerd)", await page.isChecked(`${dlg}[data-toeslag-antwoord="huurtoeslag-ja"]`));
      for (const k of ["zorgtoeslag", "kgb", "kopvang"]) await page.check(`${dlg}[data-toeslag-antwoord="${k}-nee"]`);
    }
    await volgende(); await page.waitForTimeout(100);
  }
  ok("kinderbijslag wordt automatisch berekend (6 tot 11 jaar: € 362)", /Kinderbijslag \(automatisch\)/.test(await page.textContent("main")) && /€ 362/.test(await page.textContent("main")));
  ok("Inkomen toont netto inkomen en toeslag", /€ 2\.900/.test(await page.textContent("main")) && /€ 150/.test(await page.textContent("main")));
  // Lasten: huurlasten, geen koop- of autolasten
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="lasten"]'); await page.waitForSelector("[role=dialog]");
  const l1 = await tekst();
  ok("Wonen-stap: huur ja, OZB nee", /Kale huur/.test(l1) && !/OZB/.test(l1) && /Servicekosten huurwoning/.test(l1));
  await page.check(`${dlg}[data-last-vink="huur"]`); await volgende();
  ok("bedrag verplicht bij aangevinkte last", /vul een bedrag in/.test(await tekst()));
  await v("last-bedrag", "850"); await volgende();
  const l2 = await tekst();
  ok("Vervoer-stap: geen auto dus OV en deelauto, geen autoverzekering", /Openbaar vervoer/.test(l2) && /Deelauto/.test(l2) && !/Autoverzekering/.test(l2) && !/Motorrijtuigenbelasting/.test(l2));
  await page.keyboard.press("Escape");
  // Anoniem: e-mailadres in tekstveld wordt geweigerd
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="vermogen"]'); await page.waitForSelector("[role=dialog]");
  await page.click(`${dlg}[data-knop="voeg-rekening"]`);
  await v("rek-bank", "jan@voorbeeld.nl");
  ok("e-mailadres in bankveld wordt geweigerd", /niet toegestaan/.test(await tekst()) && (await page.inputValue(`${dlg}[data-veld="rek-bank"]`)) === "");
  await v("rek-bank", "ING"); await v("rek-saldo", "25.000");
  await volgende(); // geen deposito/beleggen-stappen
  ok("Vermogen-intake slaat deposito's en beleggen over", !/Deposito's|Beleggingen/.test(await page.textContent(`${dlg}h3`)), await page.textContent(`${dlg}h3`));
  await page.keyboard.press("Escape");
  // Uitbreiden: beginnen met beleggen na de intake
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
  await page.click('[data-knop="start-beleggen"]'); await page.waitForSelector("[role=dialog]");
  ok("beginnen met beleggen opent advies-intake", /Beleggingsadvies/.test(await tekst()));
  await volgende(); ok("profiel en broker zijn verplicht", /beleggingsprofiel/.test(await tekst()));
  await page.check(`${dlg}[data-profiel="neutraal"]`); await page.selectOption(`${dlg}[data-veld="broker"]`, "Bux"); await volgende();
  await page.keyboard.press("Escape");
  // Inkomensaanvulling: bedrag per maand, de app toetst
  await page.click('[data-knop="menu"]'); await page.click('[data-menu="dashboard"]');
  await page.click('[data-knop="start-aanvulling"]'); await page.waitForSelector("[role=dialog]");
  await volgende(); ok("aanvulling: bedrag verplicht", /hoeveel aanvulling/i.test(await tekst()));
  await v("aanv-maand", "1000"); await page.selectOption(`${dlg}[data-veld="aanv-tot"]`, "datum"); await v("aanv-einde", "18-10-2028");
  const oordeel = await page.textContent(`${dlg}[data-aanv-oordeel]`);
  ok("aanvulling: oordeel toont nodig en beschikbaar", /Nodig/.test(oordeel) && /Beschikbaar/.test(oordeel) && /Uit spaargeld/.test(oordeel), oordeel.slice(0, 220));
  await page.keyboard.press("Escape");
  await page.click('[data-knop="menu"]');
  ok("advies-menu verschijnt na keuze", await page.locator('[data-menu="advies"]').count() === 1);
  await page.click('[data-knop="menu"]');
  // Back-upbalk en terugzetten
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-balkje]')]);
  const pad = "/tmp/backup.json"; await dl.saveAs(pad);
  const b = JSON.parse(require("fs").readFileSync(pad, "utf8"));
  ok("back-up bevat gegevens en versie", b.app === "inkomensplanning-blanco" && /\d{2}-\d{2}-\d{4}/.test(b.appVersie) && Object.keys(b.gegevens).length > 5);
  ok("balk meldt back-up actueel", /Back-up actueel/.test(await page.textContent('[data-balkje]')), await page.textContent('[data-balkje]'));
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector(".kop");
  await page.setInputFiles('[data-veld="backup-bestand"]', pad).catch(async () => { await page.keyboard.press("Escape"); await page.setInputFiles('[data-veld="backup-bestand"]', pad); });
  await page.waitForTimeout(1500); await page.waitForSelector(".kop");
  ok("terugzetten herstelt gegevens", (await page.evaluate(() => JSON.parse(localStorage.getItem("inkomensplanning_verm")).rekeningen[0].saldo)) === 25000);
  ok("geen pageerror", pe.length === 0, pe.join("|"));
  await browser.close(); console.log(fouten ? "FOUTEN" : "Alles OK");
})();
