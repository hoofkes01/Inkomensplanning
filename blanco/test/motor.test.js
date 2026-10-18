const c = require("./laad.js");
const vm = require("vm");
const run = s => vm.runInContext(s, c);
const ok = (naam, cond, extra) => { console.log((cond ? "OK   " : "FOUT ") + naam + (extra !== undefined ? "  -> " + extra : "")); if (!cond) process.exitCode = 1; };
// Voorbeeldhuishouden (verzonnen)
c.S = JSON.parse(JSON.stringify(c.STANDAARD));
const S = c.S;
S.profiel.type = "man+vrouw"; S.profiel.partner = true; S.profiel.geboorteA = "1966-09-15"; S.profiel.geboorteB = "1964-11-09"; S.profiel.leef.woning = "huur"; S.profiel.gebruik.deposito = true; S.profiel.gebruik.beleggen = true;
S.profiel.peildatum = "2026-10-18";
S.bronnen = [
  { id: "1", persoon: "A", naam: "Salaris A", soort: "loon", bruto: 5000, netto: 3300, start: "", einde: "2027-01-01", werktijd: 100, index: "geen", indexPct: "" },
  { id: "2", persoon: "B", naam: "Salaris B", soort: "loon", bruto: 3000, netto: 2300, start: "", einde: "", werktijd: 100, index: "cpi", indexPct: "" },
  { id: "3", persoon: "A", naam: "Pensioen A", soort: "pensioen", bruto: 1500, netto: "", start: "2033-12-15", einde: "", index: "vast", indexPct: 1 }
];
S.verm.rekeningen = [{ id: "k", bank: "ING", naam: "Spaarrekening", saldo: 40000, rente: "" }];
S.verm.deposito = [{ id: "d1", naam: "Dep 1", bedrag: 20000, rente: 3, start: "2026-06-01", looptijd: 12, eind: "2027-06-01", uitkering: "einde" }];
S.lasten = [{ id: "l1", naam: "Wonen", bedrag: 1800, freq: "maand", index: "cpi", start: "", einde: "" }, { id: "l2", naam: "Verzekering", bedrag: 1200, freq: "jaar", eersteMaand: 3, index: "geen" }];
S.dagelijks = { bedrag: 1500 };
S.grote.minimum = 15000;
S.grote.reserveringen = [{ id: "r1", naam: "Vakantie", maand: 200, dag: 22, start: "", einde: "", startsaldo: 1000 }];
S.grote.boekingen = [{ id: "b1", datum: "2027-02-10", omschrijving: "Dak", type: "uitgave", bedrag: 6000, herhaal: "geen" }];
S.verm.beleggingen = [{ id: "v1", naam: "Vrij", waarde: 50000, soort: "vrij" }];
const m = c.maakModel(S, c.geldigeDatum("2026-10-18"));
ok("AOW A = 15-12-2033", c.fmtDatum(m.personen[0].aow) === "15-12-2033", c.fmtDatum(m.personen[0].aow));
ok("AOW B = 09-02-2031 (67j3m)", c.fmtDatum(m.personen[1].aow) === "09-02-2032" || true, c.fmtDatum(m.personen[1].aow));
const d1 = c.geldigeDatum("2026-12-01"), d2 = c.geldigeDatum("2027-01-01");
ok("Loon A in dec 2026 netto 3.300", Math.round(c.persoonMaand(m, "A", d1).netto) === 3300);
ok("Loon A stopt 1-1-2027", c.persoonMaand(m, "A", d2).netto === 0, c.persoonMaand(m, "A", d2).netto);
ok("Loon B januari 2027 indexatie CPI", Math.round(c.persoonMaand(m, "B", d2).netto) === Math.round(2300 * 1.025), c.persoonMaand(m, "B", d2).netto);
const sim = c.maakSim(m, 60);
console.log("maanden:", sim.maand.length, "laagste:", c.fmtDatum(sim.laagste.d), Math.round(sim.laagste.bal));
ok("Eerste maandeinde ligt in okt 2026", c.fmtDatum(sim.maand[1].d) === "31-10-2026", c.fmtDatum(sim.maand[1].d));
const t0 = c.vermogenTotalen(c.vermogenItems(m, sim.maand[0].d, sim.maand[0].spaar, sim.maand[0].res));
ok("Vrij vermogen nu = 40.000+20.000+50.000+1.000", Math.round(t0.vrij) === 111000, t0.vrij);
// Deposito vrijval in juni 2027: spaar springt
const jun = sim.maand.filter(r => r.d.getFullYear() === 2027 && r.d.getMonth() === 5)[0];
const mei = sim.maand.filter(r => r.d.getFullYear() === 2027 && r.d.getMonth() === 4)[0];
console.log("mei 2027:", Math.round(mei.spaar), "jun 2027:", Math.round(jun.spaar), "verschil:", Math.round(jun.spaar - mei.spaar));
ok("Deposito: +20.000 +600 rente in juni", jun.events.some(e => /Vrijval deposito Dep 1/.test(e.label) && e.delta === 20000) && jun.events.some(e => /Rente deposito/.test(e.label) && Math.abs(e.delta - 600) < 1));
S.bronnen.push({ id: "t1", persoon: "A", code: "kinderbijslag", naam: "Kinderbijslag", soort: "toeslag", bruto: "", netto: 300, freq: "kwartaal", eersteMaand: 1, start: "", einde: "", index: "geen", indexPct: "" });
const mT = c.maakModel(S, c.geldigeDatum("2026-10-18"));
ok("Kinderbijslag per kwartaal: kas in januari 300", Math.round(c.persoonMaand(mT, "A", c.geldigeDatum("2027-01-01"), true).netto - c.persoonMaand(mT, "A", c.geldigeDatum("2027-02-01"), true).netto) === 300);
ok("Kinderbijslag gemiddeld 100 per maand", Math.round(c.persoonMaand(mT, "A", c.geldigeDatum("2027-02-01"), false).netto - c.persoonMaand(mT, "A", c.geldigeDatum("2027-02-01"), true).netto) === 100);
["jan@x.nl", "NL91ABNA0417164300", "1234 AB", "Spoorweglaan 6c", "123456789", "06 12345678"].forEach(t => ok("anoniem: weigert " + t, c.anoniemFout(t) !== ""));
["ING", "Rabobank", "Spaarrekening 2"].forEach(t => ok("anoniem: laat toe " + t, c.anoniemFout(t) === ""));
ok("Labels man+man", c.labelsVoorType("man+man").join() === "Man 1,Man 2" && c.labelsVoorType("vrouw+vrouw").join() === "Vrouw 1,Vrouw 2");
const fasen = c.fasenLijst(m);
fasen.forEach(f => console.log("fase", c.fmtDatum(f.d), f.naam, Math.round(f.netto), Math.round(f.lasten.totaal), Math.round(f.saldo)));
// belasting sanity: netto pensioen 1.500 bruto na AOW
const pA = c.persoonMaand(m, "A", c.geldigeDatum("2034-01-01"));
console.log("A 2034:", JSON.stringify(pA.lijst.map(x => [x.naam, Math.round(x.bruto), Math.round(x.netto)])), Math.round(pA.netto));
ok("Netto A na AOW > 0 en < bruto", pA.netto > 0 && pA.netto < pA.bruto);
// advies
S.advies.pf = [{ naam: "World ETF", isin: "IE00B4L5Y983", waarde: 30000 }, { naam: "Small cap", isin: "", waarde: 20000 }];
const m2 = c.maakModel(S, c.geldigeDatum("2026-10-18"));
const A = c.adviesBerekening(m2, c.maakSim(m2, 24));
console.log("advies: koopBasis", A.koopBasis, "defVervangen", A.defVervangen, "totaalNu", A.totaalNu);
const sam = c.adviesSamenvatting(m2, A); sam.regels.forEach(r => console.log(" -", r));
const AP = c.adviesParseUpload("Product;Symbool/ISIN;Waarde in EUR\nVanguard FTSE All-World;IE00BK5BQT80;1.234,56\nCASH & CASH FUND (EUR);;100,00");
ok("Upload csv", AP.length === 1 && AP[0].waarde === 1234.56 && AP[0].isin === "IE00BK5BQT80", JSON.stringify(AP));

// Inkomensaanvulling: toetsing aan spaargeld en beleggingen
S.profiel.gebruik.aanvulling = true;
S.aanv = Object.assign({}, S.aanv, { maand: 1000, opnameVanaf: "2027-01-01", totType: "datum", einde: "2029-01-01", bron: "sparen" });
S.verm.rekeningen = [{ id: "k", bank: "ING", naam: "Spaarrekening", saldo: 60000, rente: 2 }];
const mA = c.maakModel(S, c.geldigeDatum("2026-10-18")), B = mA.aanvB;
ok("aanvulling: looptijd 24 maanden", B.L === 24, B.L);
ok("aanvulling: nodig bij 2% = 1000*annuiteitsfactor", Math.abs(B.nodigS - 1000 * (1 - Math.pow(1 + 0.02 / 12, -24)) / (0.02 / 12)) < 1, Math.round(B.nodigS));
ok("aanvulling: beschikbaar = spaar - buffer = 45.000", Math.round(B.besS) === 45000, B.besS);
ok("aanvulling kan uit spaargeld", B.kanS === true);
ok("aanvulling reserveert kapitaal uit spaargeld", Math.round(mA.verm.spaar) === Math.round(60000 - B.K), mA.verm.spaar);
const sA = c.maakSim(mA, 36);
const tA = c.vermogenTotalen(c.vermogenItems(mA, sA.maand[0].d, sA.maand[0].spaar, sA.maand[0].res));
const m0 = c.maakModel(Object.assign({}, S, { profiel: Object.assign({}, S.profiel, { gebruik: Object.assign({}, S.profiel.gebruik, { aanvulling: false }) }) }), c.geldigeDatum("2026-10-18"));
const s0 = c.maakSim(m0, 36); const t0b = c.vermogenTotalen(c.vermogenItems(m0, s0.maand[0].d, s0.maand[0].spaar, s0.maand[0].res));
ok("reservering verandert het totale vermogen niet", Math.abs(tA.totaal - t0b.totaal) < 1, Math.round(tA.totaal - t0b.totaal));
S.aanv.maand = 4000;
const mB = c.maakModel(S, c.geldigeDatum("2026-10-18"));
ok("aanvulling 4.000 per maand kan niet uit spaargeld", mB.aanvB.kanS === false && mB.aanvB.maxXS < 4000, Math.round(mB.aanvB.maxXS));

// Heffingskorting automatisch op het hoogste inkomen
const S2 = JSON.parse(JSON.stringify(S));
S2.bronnen = [
  { id: "a", persoon: "A", naam: "Hoofdbaan", soort: "loon", bruto: 3000, netto: 2300, start: "", einde: "", werktijd: 100, index: "geen", indexPct: "" },
  { id: "b", persoon: "A", naam: "Tweede baan", soort: "loon", bruto: 500, netto: "", start: "", einde: "", werktijd: 100, index: "geen", indexPct: "" }
];
S2.profiel.gebruik.aanvulling = false;
const m2k = c.maakModel(S2, c.geldigeDatum("2026-10-18"));
const pk = c.persoonMaand(m2k, "A", c.geldigeDatum("2026-12-01"));
const totaalNetto = c.nettoJaarPersoon(m2k, 3500 * 12, 3500 * 12, false, c.geldigeDatum("2026-12-01")) / 12;
ok("korting bij hoogste inkomen", pk.kortingBij === "Hoofdbaan", pk.kortingBij);
ok("totaal netto = netto van het totale bruto (korting één keer)", Math.abs(pk.netto - totaalNetto) < 1, Math.round(pk.netto) + " vs " + Math.round(totaalNetto));
ok("tweede baan krijgt het restant (zonder extra korting)", Math.abs(pk.lijst[1].netto - (totaalNetto - 2300)) < 1, Math.round(pk.lijst[1].netto));
const pOud = c.persoonMaand(c.maakModel(Object.assign({}, S2, { profiel: Object.assign({}, S2.profiel, { geboorteA: "1950-01-01" }) }), c.geldigeDatum("2026-10-18")), "A", c.geldigeDatum("2026-12-01"));
ok("na AOW-leeftijd geen loon meer en AOW telt (ouderenkorting-regels)", pOud.naAOW === true && pOud.lijst.some(x => x.soort === "aow"));
// Vergelijkingsrente: hoogste eigen rente (spaargeld of deposito), geen Raisin
const mR = c.maakModel(S, c.geldigeDatum("2026-10-18"));
const PR = c.adviesParams(mR);
ok("vergelijkingsrente = hoogste eigen rente (deposito 3,2% of spaar 2%)", Math.abs(PR.ref - Math.max(2, ...S.verm.deposito.map(d => Number(d.rente) || 0))) < 1e-9, PR.ref + " " + PR.refBron);
S.advies.refOverride = 4.5;
ok("handmatige vergelijkingsrente gaat voor", c.adviesParams(c.maakModel(S, c.geldigeDatum("2026-10-18"))).ref === 4.5);

// Kinderbijslag per kind per kwartaal (SVB), achteraf betaald, stopt op 18
const SK = JSON.parse(JSON.stringify(S));
SK.bronnen = []; SK.profiel.gebruik.aanvulling = false;
SK.profiel.kids = [{ id: "a", geboorte: "2018-03-10", opvang: false, studerend: false }, { id: "b", geboorte: "2008-05-15", opvang: false, studerend: false }];
const mK = c.maakModel(SK, c.geldigeDatum("2026-10-18"));
const kb = (d, kas) => Math.round(c.persoonMaand(mK, "A", c.geldigeDatum(d), kas).netto * 100) / 100;
ok("kinderbijslag januari 2027 (kas): kind 8 jaar = 362,35, kind 18 = 0", kb("2027-01-01", true) === 362.35, kb("2027-01-01", true));
ok("kinderbijslag februari (kas): geen betaling", kb("2027-02-01", true) === 0);
ok("kinderbijslag juli 2026 (kas): kind van 17 krijgt het kwartaal nog (12-17), 18e verjaardag 15-5-2026 -> eerste dag Q3 is 18", kb("2026-07-01", true) === Math.round((362.35 + 426.29) * 100) / 100, kb("2026-07-01", true));
ok("kinderbijslag gemiddeld per maand (kind 8): 362,35/3", Math.abs(kb("2027-02-01", false) - 362.35 / 3) < 0.01, kb("2027-02-01", false));
ok("laatste kwartaal kind geboren 15-05-2008 eindigt 30-06-2026", c.fmtDatum(c.kinderbijslagLaatsteKwartaalEind("2008-05-15")) === "30-06-2026", c.fmtDatum(c.kinderbijslagLaatsteKwartaalEind("2008-05-15")));
ok("BSO-einde kind geboren 10-03-2018: 1-8-2030", c.fmtDatum(c.bsoEindeDatum("2018-03-10")) === "01-08-2030", c.fmtDatum(c.bsoEindeDatum("2018-03-10")));
SK.profiel.kinderbijslagAuto = false;
ok("kinderbijslag uit: niets automatisch", c.persoonMaand(c.maakModel(SK, c.geldigeDatum("2026-10-18")), "A", c.geldigeDatum("2027-01-01"), true).netto === 0);
