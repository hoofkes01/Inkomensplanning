// Voorbeeldhuishouden (verzonnen) voor tests.
const c = require("./laad.js");
const S = JSON.parse(JSON.stringify(c.STANDAARD));
S.profiel.type = "man+vrouw"; S.profiel.partner = true; S.profiel.akkoordAnoniem = true; S.profiel.naamA = "Man"; S.profiel.naamB = "Vrouw"; S.profiel.werk = { A: ["loon"], B: ["loon", "pensioen"] }; S.profiel.leef = { woning: "koop", woz: 400000, woningGeen: "", auto: "eigen", kinderen: 1, opvang: false, studerend: true, huisdier: false }; S.profiel.geboorteA = "1966-09-15"; S.profiel.geboorteB = "1964-11-09"; S.profiel.peildatum = "2026-10-18";
S.profiel.gebruik = { hypotheek: true, deposito: true, beleggen: true, aanvulling: true, pensioen: true };
S.inst.cpiStand = "2026-10-10"; S.inst.spaarrenteStand = "2026-10-15"; S.inst.cijfersDatum = "2026-10-15";
S.advies.raisinStand = "2026-10-15"; S.advies.euriborStand = "2026-10-15"; S.advies.pfDatum = "2026-10-10"; S.advies.wachtTot = 55000; S.advies.behoudAan = true;
S.bronnen = [
  { id: "b1", persoon: "A", code: "loon", naam: "Loon (dienstverband)", soort: "loon", bruto: 5000, netto: 3300, start: "", einde: "2027-01-01", werktijd: 100, index: "vast", indexPct: 2, kortingInNetto: true, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" },
  { id: "b2", persoon: "B", code: "loon", naam: "Loon (dienstverband)", soort: "loon", bruto: 3000, netto: 2300, start: "", einde: "", werktijd: 100, index: "cpi", indexPct: "", kortingInNetto: true, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" },
  { id: "b3", persoon: "A", code: "pensioen", naam: "Pensioen van een pensioenfonds of verzekeraar", soort: "pensioen", bruto: 1500, netto: "", start: "2033-12-15", einde: "", werktijd: "", index: "vast", indexPct: 1, kortingInNetto: true, wijzigDatum: "2035-01-01", wijzigBruto: 1700, wijzigNetto: "" },
  { id: "b4", persoon: "B", code: "pensioen", naam: "Pensioen van een pensioenfonds of verzekeraar", soort: "pensioen", bruto: 900, netto: 800, start: "2032-02-09", einde: "", werktijd: "", index: "geen", indexPct: "", kortingInNetto: false, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" }
  ,{ id: "b5", persoon: "A", code: "zorgtoeslag", naam: "Zorgtoeslag", soort: "toeslag", bruto: "", netto: 120, freq: "maand", eersteMaand: 1, start: "", einde: "", index: "geen", indexPct: "" },
  { id: "b6", persoon: "A", code: "kinderbijslag", naam: "Kinderbijslag", soort: "toeslag", bruto: "", netto: 300, freq: "kwartaal", eersteMaand: 1, start: "", einde: "2030-01-01", index: "geen", indexPct: "" }
];
S.werkJaren = { A: { 2027: false }, B: {} };
S.aanv = { naam: "Overbrugging", startsaldo: 60000, maand: 1500, opnameAan: true, opnameVanaf: "2027-01-01", rendement: 3, kosten: 0.5, einde: "", mutaties: [{ id: "m1", datum: "2027-06-01", bedrag: 5000 }] };
S.potten = [{ id: "p1", persoon: "A", naam: "Lijfrente Anna", soort: "lijfrente", saldo: 120000, geblokkeerdTot: "", start: "", rendVoor: 4, rendTijdens: 3, looptijd: 20, inleg: 3000, inlegTot: "2030-01-01" }];
S.hyp = { bedrag: 150000, rente: 3.2, maandlast: 900, aflossing: 300, vorm: "annuiteit", aflosEinde: "2033-12-31", renteVastTot: "2027-05-01" };
S.lasten = [
  { id: "l0", code: "zorgverz", persoon: "A", naam: "Zorgverzekering (basis) (Man)", bedrag: 140, freq: "maand", eersteMaand: 1, index: "cpi", indexPct: "", start: "", einde: "" },
  { id: "l1", code: "energie", naam: "Gas, elektriciteit en stadsverwarming", bedrag: 1100, freq: "maand", eersteMaand: 1, index: "cpi", indexPct: "", start: "", einde: "" },
  { id: "l2", code: "aansprakelijk", naam: "Aansprakelijkheidsverzekering", bedrag: 1200, freq: "jaar", eersteMaand: 3, index: "geen", indexPct: "", start: "", einde: "" },
  { id: "l3", code: "afval_riool", naam: "Afvalstoffenheffing en rioolheffing", bedrag: 450, freq: "kwartaal", eersteMaand: 2, index: "vast", indexPct: 2, start: "", einde: "" }
];
S.dagelijks = { bedrag: 1500 };
S.verm.rekeningen = [{ id: "k1", bank: "ING", naam: "Spaarrekening", saldo: 30000, rente: 2.5 }, { id: "k2", bank: "Rabobank", naam: "Betaalrekening", saldo: 15000, rente: "" }];
S.verm.deposito = [
  { id: "d1", bank: "Bank Een", naam: "Bank Een 12 mnd", bedrag: 20000, rente: 3, start: "2026-06-01", looptijd: 12, eind: "2027-06-01", uitkering: "einde", reedsUitgekeerd: "" },
  { id: "d2", bank: "Bank Twee", naam: "Bank Twee 36 mnd", bedrag: 30000, rente: 3.2, start: "2025-12-01", looptijd: 36, eind: "2028-12-01", uitkering: "jaarlijks", reedsUitgekeerd: "" },
  { id: "d3", bank: "Bank Drie", naam: "Bank Drie 6 mnd", bedrag: 10000, rente: 2.9, start: "2026-04-25", looptijd: 6, eind: "2026-10-25", uitkering: "einde", reedsUitgekeerd: "" }
];
S.verm.beleggingen = [{ id: "v1", bank: "DEGIRO", naam: "DEGIRO vrij beleggen", waarde: 50000, soort: "vrij" }, { id: "v2", bank: "Brand New Day", naam: "Brand New Day pensioen", waarde: 40000, soort: "pensioen" }];
S.verm.overig = [{ id: "o1", naam: "Auto", waarde: 12000, box3: true }];
S.verm.schulden = [{ id: "s1", naam: "Lening aan kind(eren)", bedrag: 10000, soort: "uitstaand" }];
S.grote.reserveringen = [{ id: "r1", naam: "Vakantie", maand: 200, dag: 22, start: "", einde: "", startsaldo: 1000 }];
S.grote.boekingen = [{ id: "g1", datum: "2027-02-10", omschrijving: "Verbouwing of groot onderhoud woning", type: "uitgave", bedrag: 6000, reserveringId: "", herhaal: "geen", tot: "" }, { id: "g2", datum: "2027-07-10", omschrijving: "Vakantie", type: "uitgave", bedrag: 2500, reserveringId: "r1", herhaal: "jaarlijks", tot: "" }];
S.advies.pf = [
  { id: "f1", naam: "iShares Core MSCI World UCITS ETF USD Acc", isin: "IE00B4L5Y983", waarde: 20000, cat: "auto", behoud: false },
  { id: "f2", naam: "Chip fonds thema", isin: "", waarde: 15000, cat: "off", behoud: true },
  { id: "f3", naam: "Small cap fonds", isin: "", waarde: 15000, cat: "auto", behoud: false }
];
const intake = {}; ["dashboard", "inkomen", "aanvulling", "pensioen", "lasten", "vermogen", "grote", "advies", "rapport"].forEach(k => intake[k] = { gezien: true, klaar: k !== "rapport", stap: 0, overgeslagen: [] });
S.actual = { datum: { spaar: "2026-10-10", inkomen: "2026-09-01" } };
S.intake = intake;
const opslag = {};
Object.keys(S).forEach(k => opslag["inkomensplanning_" + k] = JSON.stringify(S[k]));
module.exports = { S, opslag };
