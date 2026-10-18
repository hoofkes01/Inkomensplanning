// Voorbeeldhuishouden (verzonnen) voor tests.
const c = require("./laad.js");
const S = JSON.parse(JSON.stringify(c.STANDAARD));
S.profiel.naamA = "Anna"; S.profiel.naamB = "Bas"; S.profiel.geboorteA = "1966-09-15"; S.profiel.geboorteB = "1964-11-09"; S.profiel.peildatum = "2026-10-18";
S.profiel.gebruik = { hypotheek: true, deposito: true, beleggen: true, aanvulling: true, pensioen: true };
S.inst.cpiStand = "2026-10-10"; S.inst.spaarrenteStand = "2026-10-15"; S.inst.backupDatum = "2026-10-01";
S.advies.raisinStand = "2026-10-15"; S.advies.euriborStand = "2026-10-15"; S.advies.pfDatum = "2026-10-10"; S.advies.wachtTot = 55000; S.advies.behoudAan = true;
S.bronnen = [
  { id: "b1", persoon: "A", naam: "Salaris Anna", soort: "loon", bruto: 5000, netto: 3300, start: "", einde: "2027-01-01", werktijd: 100, index: "vast", indexPct: 2, kortingInNetto: true, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" },
  { id: "b2", persoon: "B", naam: "Salaris Bas met een nogal lange omschrijving van de baan", soort: "loon", bruto: 3000, netto: 2300, start: "", einde: "", werktijd: 100, index: "cpi", indexPct: "", kortingInNetto: true, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" },
  { id: "b3", persoon: "A", naam: "Pensioen Anna", soort: "pensioen", bruto: 1500, netto: "", start: "2033-12-15", einde: "", werktijd: "", index: "vast", indexPct: 1, kortingInNetto: true, wijzigDatum: "2035-01-01", wijzigBruto: 1700, wijzigNetto: "" },
  { id: "b4", persoon: "B", naam: "Pensioen Bas", soort: "pensioen", bruto: 900, netto: 800, start: "2032-02-09", einde: "", werktijd: "", index: "geen", indexPct: "", kortingInNetto: false, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" }
];
S.werkJaren = { A: { 2027: false }, B: {} };
S.aanv = { naam: "Overbrugging", startsaldo: 60000, maand: 1500, opnameAan: true, opnameVanaf: "2027-01-01", rendement: 3, kosten: 0.5, einde: "", mutaties: [{ id: "m1", datum: "2027-06-01", bedrag: 5000 }] };
S.potten = [{ id: "p1", persoon: "A", naam: "Lijfrente Anna", soort: "lijfrente", saldo: 120000, geblokkeerdTot: "", start: "", rendVoor: 4, rendTijdens: 3, looptijd: 20, inleg: 3000, inlegTot: "2030-01-01" }];
S.hyp = { bedrag: 150000, rente: 3.2, maandlast: 900, aflossing: 300, vorm: "annuiteit", aflosEinde: "2033-12-31", renteVastTot: "2027-05-01" };
S.lasten = [
  { id: "l1", naam: "Wonen en energie", bedrag: 1100, freq: "maand", eersteMaand: 1, index: "cpi", indexPct: "", start: "", einde: "" },
  { id: "l2", naam: "Verzekeringen", bedrag: 1200, freq: "jaar", eersteMaand: 3, index: "geen", indexPct: "", start: "", einde: "" },
  { id: "l3", naam: "Gemeentelijke belastingen en waterschap", bedrag: 450, freq: "kwartaal", eersteMaand: 2, index: "vast", indexPct: 2, start: "", einde: "" }
];
S.dagelijks = { bedrag: 1500 };
S.verm.spaar = 45000;
S.verm.deposito = [
  { id: "d1", naam: "Deposito Bank Een", bedrag: 20000, rente: 3, start: "2026-06-01", looptijd: 12, eind: "2027-06-01", uitkering: "einde", reedsUitgekeerd: "" },
  { id: "d2", naam: "Deposito Bank Twee (jaarlijks)", bedrag: 30000, rente: 3.2, start: "2025-12-01", looptijd: 36, eind: "2028-12-01", uitkering: "jaarlijks", reedsUitgekeerd: "" },
  { id: "d3", naam: "Deposito verloopt snel", bedrag: 10000, rente: 2.9, start: "2026-04-25", looptijd: 6, eind: "2026-10-25", uitkering: "einde", reedsUitgekeerd: "" }
];
S.verm.beleggingen = [{ id: "v1", naam: "DEGIRO vrij", waarde: 50000, soort: "vrij" }, { id: "v2", naam: "Pensioenbeleggingen", waarde: 40000, soort: "pensioen" }];
S.verm.overig = [{ id: "o1", naam: "Woning", waarde: 400000, box3: false }];
S.verm.schulden = [{ id: "s1", naam: "Lening aan kind", bedrag: 10000, soort: "uitstaand" }];
S.grote.reserveringen = [{ id: "r1", naam: "Vakantie", maand: 200, dag: 22, start: "", einde: "", startsaldo: 1000 }];
S.grote.boekingen = [{ id: "g1", datum: "2027-02-10", omschrijving: "Nieuw dak", type: "uitgave", bedrag: 6000, reserveringId: "", herhaal: "geen", tot: "" }, { id: "g2", datum: "2027-07-10", omschrijving: "Vakantie", type: "uitgave", bedrag: 2500, reserveringId: "r1", herhaal: "jaarlijks", tot: "" }];
S.advies.pf = [
  { id: "f1", naam: "iShares Core MSCI World UCITS ETF USD Acc", isin: "IE00B4L5Y983", waarde: 20000, cat: "auto", behoud: false },
  { id: "f2", naam: "Chip fonds thema", isin: "", waarde: 15000, cat: "off", behoud: true },
  { id: "f3", naam: "Small cap fonds", isin: "", waarde: 15000, cat: "auto", behoud: false }
];
const intake = {}; ["dashboard", "inkomen", "aanvulling", "pensioen", "lasten", "vermogen", "grote", "fiscaal", "advies", "rapport"].forEach(k => intake[k] = { gezien: true, klaar: k !== "rapport", stap: 0, overgeslagen: [] });
S.intake = intake;
const opslag = {};
Object.keys(S).forEach(k => opslag["inkomensplanning_" + k] = JSON.stringify(S[k]));
module.exports = { S, opslag };
