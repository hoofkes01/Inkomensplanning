/* ===== Beginwaarden: alles blanco. Alleen instelbare aannames hebben een standaardwaarde. ===== */
var MENUS = [
  { id: "dashboard", naam: "Dashboard" },
  { id: "inkomen", naam: "Inkomen" },
  { id: "aanvulling", naam: "Toevoeging inkomen" },
  { id: "pensioen", naam: "Lijfrente en pensioen" },
  { id: "lasten", naam: "Vaste lasten en dagelijkse uitgaven" },
  { id: "vermogen", naam: "Vermogen" },
  { id: "grote", naam: "Grote posten en reserveringen" },
  { id: "fiscaal", naam: "Fiscaliteit & AOW" },
  { id: "advies", naam: "Beleggingsadvies" },
  { id: "rapport", naam: "Rapport (PDF)" }
];
var STANDAARD = {
  profiel: { naamA: "Persoon A", naamB: "Persoon B", geboorteA: "", geboorteB: "", aowA: "", aowB: "", partner: true, peildatum: "", gebruik: { hypotheek: false, deposito: true, beleggen: true, aanvulling: false, pensioen: true } },
  // Marktcijfers en aannames: standaardwaarden zijn voorbeelden. Zolang 'stand' leeg is, meldt de app dat ze nog niet zijn gecontroleerd.
  inst: { cpi: 2.5, cpiIjk: "", cpiStand: "", spaarrente: 2, spaarrenteStand: "", rendBeleggen: 5, rendPot: 4, rendPotTijdens: 3, indexSchijven: 2, indexAOW: 2, dagInkomen: 25, dagLasten: 1, kortMee: true, kortMaanden: 3, backupDatum: "" },
  bronnen: [],
  werkJaren: { A: {}, B: {} },
  aanv: { naam: "Inkomensaanvulling", startsaldo: "", maand: "", opnameAan: true, opnameVanaf: "", rendement: 3, kosten: 0.5, einde: "", mutaties: [] },
  potten: [],
  hyp: { bedrag: "", rente: "", maandlast: "", aflossing: "", vorm: "annuiteit", aflosEinde: "", renteVastTot: "" },
  lasten: [],
  dagelijks: { bedrag: "" },
  verm: { spaar: "", deposito: [], beleggingen: [], overig: [], schulden: [] },
  grote: { minimum: 7500, startsaldoGezet: false, reserveringen: [], boekingen: [], renteOverride: {} },
  fiscOverride: {},
  box3: { stelsel: "huidig", tarief: "", vrijPP: "", sparenPct: "", beleggenPct: "" },
  advies: {
    doelOff: 50, doelNeu: 30, doelDef: 20, drempel: 15000, marge: 0.3, belasting: 36, stelsel: "forfait", forfaitSparen: 1.28, forfaitBeleg: 6,
    euribor: 3.2, euriborStand: "", raisin6: 3.15, raisinStand: "", wachtTot: "", behoudAan: false, risico: "gemiddeld",
    pf: [], pfDatum: "", rekeningId: "", rend: {},
    markt: { datum: "", punten: [] }
  },
  rapport: { titel: "Inkomensplanning", onderdelen: {}, advies: true },
  intake: {}
};
var SOORTEN_BRON = [["loon", "Loon (uit werk)"], ["uitkering", "Uitkering"], ["pensioen", "Pensioen"], ["overig", "Overig inkomen"]];
var SOORT_NAAM = { loon: "Loon", uitkering: "Uitkering", pensioen: "Pensioen", overig: "Overig inkomen", aow: "AOW", pot: "Pensioenpot" };
var INDEX_KEUZES = [["cpi", "Prijsindex (CPI)"], ["vast", "Vast percentage (bijv. cao)"], ["geen", "Geen indexatie"]];
