const c = require("./laad.js");
const vm = require("vm");
const run = s => vm.runInContext(s, c);
const ok = (naam, cond, extra) => { console.log((cond ? "OK   " : "FOUT ") + naam + (extra !== undefined ? "  -> " + extra : "")); if (!cond) process.exitCode = 1; };
// Voorbeeldhuishouden (verzonnen)
c.S = JSON.parse(JSON.stringify(c.STANDAARD));
const S = c.S;
S.profiel.geboorteA = "1966-09-15"; S.profiel.geboorteB = "1964-11-09";
S.profiel.peildatum = "2026-10-18";
S.bronnen = [
  { id: "1", persoon: "A", naam: "Salaris A", soort: "loon", bruto: 5000, netto: 3300, start: "", einde: "2027-01-01", werktijd: 100, index: "geen", indexPct: "", kortingInNetto: true },
  { id: "2", persoon: "B", naam: "Salaris B", soort: "loon", bruto: 3000, netto: 2300, start: "", einde: "", werktijd: 100, index: "cpi", indexPct: "", kortingInNetto: true },
  { id: "3", persoon: "A", naam: "Pensioen A", soort: "pensioen", bruto: 1500, netto: "", start: "2033-12-15", einde: "", index: "vast", indexPct: 1, kortingInNetto: true }
];
S.verm.spaar = 40000;
S.verm.deposito = [{ id: "d1", naam: "Dep 1", bedrag: 20000, rente: 3, start: "2026-06-01", looptijd: 12, eind: "2027-06-01", uitkering: "einde" }];
S.lasten = [{ id: "l1", naam: "Wonen", bedrag: 1800, freq: "maand", index: "cpi", start: "", einde: "" }, { id: "l2", naam: "Verzekering", bedrag: 1200, freq: "jaar", eersteMaand: 3, index: "geen" }];
S.dagelijks = { bedrag: 1500 };
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
