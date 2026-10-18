/* ===== Beginwaarden en vaste lijsten. Alles blanco; alleen instelbare aannames hebben een standaardwaarde. ===== */
var MENUS = [
  { id: "dashboard", naam: "Dashboard", intake: true },
  { id: "inkomen", naam: "Inkomen", intake: true },
  { id: "aanvulling", naam: "Toevoeging inkomen", intake: true, vereist: "aanvulling" },
  { id: "pensioen", naam: "Lijfrente en pensioen", intake: true },
  { id: "lasten", naam: "Vaste lasten en dagelijkse uitgaven", intake: true },
  { id: "vermogen", naam: "Vermogen", intake: true },
  { id: "grote", naam: "Grote posten en reserveringen", intake: true },
  { id: "fiscaal", naam: "Fiscaliteit & AOW", intake: false },
  { id: "advies", naam: "Beleggingsadvies", intake: true, vereist: "beleggen" },
  { id: "rapport", naam: "Rapport (PDF)", intake: true }
];
// Menu's die voor deze gebruiker van toepassing zijn (afhankelijk van de intake).
function actieveMenus(profiel) {
  return MENUS.filter(function (x) { return !x.vereist || (profiel.gebruik && profiel.gebruik[x.vereist]); });
}
var STANDAARD = {
  profiel: {
    type: "", partner: false, fiscalePartners: true, naamA: "Persoon A", naamB: "Persoon B", geboorteA: "", geboorteB: "", aowA: "", aowB: "", peildatum: "", akkoordAnoniem: false,
    werk: { A: [], B: [] }, kids: [], kinderbijslagAuto: true,
    leef: { woning: "", woningGeen: "", woz: "", auto: "", eigen: "", lease: "", deel: false, kinderen: 0, opvang: false, studerend: false, huisdier: false },
    gebruik: { hypotheek: false, deposito: false, beleggen: false, aanvulling: false, pensioen: false }
  },
  // Marktcijfers en aannames: standaardwaarden zijn voorbeelden. Zolang 'stand' leeg is, meldt de app dat ze nog niet zijn bijgewerkt.
  inst: { cpi: 2.5, cpiIjk: "", cpiStand: "", spaarrente: 2, spaarrenteStand: "", rendBeleggen: 4, rendPot: 4, rendPotTijdens: 3, indexSchijven: 2, indexAOW: 2, dagInkomen: 25, dagLasten: 1, kortMee: true, kortMaanden: 3, backupDatum: "", cijfersDatum: "", cijfersFout: null },
  bronnen: [],
  werkJaren: { A: {}, B: {} },
  aanv: { naam: "Inkomensaanvulling", maand: "", opnameVanaf: "", totType: "aow", totPersoon: "A", einde: "", bron: "sparen", startsaldo: "", rendement: 3, kosten: 0, opnameAan: true, mutaties: [] },
  potten: [],
  hyp: { delen: [], voordeelInNetto: false },
  lasten: [],
  dagelijks: { bedrag: "" },
  verm: { rekeningen: [], deposito: [], beleggingen: [], overig: [], schulden: [] },
  grote: { minimum: "", reserveringen: [], boekingen: [], renteOverride: {} },
  fiscOverride: {},
  box3: { stelsel: "huidig", tarief: "", vrijPP: "", sparenPct: "", beleggenPct: "" },
  advies: {
    risico: "", broker: "", eigenDoel: false, doelOff: 50, doelNeu: 30, doelDef: 20, drempel: "", marge: 0.3, belasting: 36, stelsel: "forfait", forfaitSparen: 1.28, forfaitBeleg: 6,
    refOverride: "", wachtTot: "", behoudAan: false,
    pf: [], pfDatum: "", rekeningId: "", rend: {},
    markt: { datum: "", punten: [] }
  },
  rapport: { titel: "Inkomensplanning", onderdelen: {}, advies: true },
  intake: {},
  actual: { datum: {} },
  cijfers: {}
};

/* ---------- Huishouden ---------- */
var HUISHOUDENS = [["man", "Een man"], ["vrouw", "Een vrouw"], ["man+vrouw", "Een man en een vrouw"], ["man+man", "Twee mannen"], ["vrouw+vrouw", "Twee vrouwen"]];
function labelsVoorType(t) {
  return { man: ["Man"], vrouw: ["Vrouw"], "man+vrouw": ["Man", "Vrouw"], "man+man": ["Man 1", "Man 2"], "vrouw+vrouw": ["Vrouw 1", "Vrouw 2"] }[t] || ["Persoon A"];
}
var WERKSTATUS = [["loon", "Werknemer (loondienst)"], ["zzp", "Zelfstandige (zzp)"], ["uitkering", "Uitkering (WW, WIA, bijstand, Anw)"], ["pensioen", "Pensioen (ontvangen of straks)"], ["student", "Student"], ["geen", "Geen inkomen uit werk"]];

/* ---------- Inkomsten: vaste omschrijvingen ---------- */
// soort: loon | uitkering | pensioen | overig | toeslag (belastingvrij). wanneer(L, werk) bepaalt of de post voor deze persoon past.
var BRON_CAT = [
  { code: "loon", label: "Loon (dienstverband)", soort: "loon", freq: "maand", wanneer: function (L, w) { return w.indexOf("loon") >= 0; } },
  { code: "zzp", label: "Winst uit onderneming (zzp)", soort: "loon", freq: "maand", wanneer: function (L, w) { return w.indexOf("zzp") >= 0; } },
  { code: "ww", label: "WW-uitkering", soort: "uitkering", freq: "maand", wanneer: function (L, w) { return w.indexOf("uitkering") >= 0; } },
  { code: "wia", label: "Uitkering bij ziekte of arbeidsongeschiktheid (WIA, WAO, Wajong)", soort: "uitkering", freq: "maand", wanneer: function (L, w) { return w.indexOf("uitkering") >= 0; } },
  { code: "bijstand", label: "Bijstandsuitkering", soort: "uitkering", freq: "maand", wanneer: function (L, w) { return w.indexOf("uitkering") >= 0; } },
  { code: "anw", label: "Nabestaandenuitkering (Anw)", soort: "uitkering", freq: "maand", wanneer: function (L, w) { return w.indexOf("uitkering") >= 0; } },
  { code: "pensioen", label: "Pensioen van een pensioenfonds of verzekeraar", soort: "pensioen", freq: "maand", wanneer: function (L, w) { return w.indexOf("pensioen") >= 0; } },
  { code: "studiefin", label: "Studiefinanciering of stipendium", soort: "toeslag", freq: "maand", wanneer: function (L, w) { return w.indexOf("student") >= 0; } },
  { code: "huurtoeslag", label: "Huurtoeslag", soort: "toeslag", freq: "maand", wanneer: function (L) { return L.woning === "huur"; } },
  { code: "zorgtoeslag", label: "Zorgtoeslag", soort: "toeslag", freq: "maand", wanneer: function () { return true; } },
  { code: "kgb", label: "Kindgebonden budget", soort: "toeslag", freq: "maand", wanneer: function (L) { return L.kinderen > 0; } },
  { code: "kopvang", label: "Kinderopvangtoeslag", soort: "toeslag", freq: "maand", wanneer: function (L) { return L.kinderen > 0 && L.opvang; } },
  { code: "kinderbijslag", label: "Kinderbijslag", soort: "toeslag", freq: "kwartaal", wanneer: function (L) { return L.kinderen > 0 && !L.kbAuto; } },
  { code: "kinderalim_ontv", label: "Kinderalimentatie (ontvangen)", soort: "toeslag", freq: "maand", wanneer: function (L) { return L.kinderen > 0; } },
  { code: "partneralim_ontv", label: "Partneralimentatie (ontvangen, belast)", soort: "overig", freq: "maand", wanneer: function () { return true; } },
  { code: "verhuur", label: "Huurinkomsten uit verhuur", soort: "overig", freq: "maand", wanneer: function () { return true; } },
  { code: "extra_kb", label: "Extra kinderbijslag bij intensieve zorg (vast bedrag per jaar)", soort: "toeslag", freq: "jaar", wanneer: function (L) { return L.beperking; } },
  { code: "tegemoetkoming", label: "Tegemoetkoming of vergoeding voor zorg of hulpmiddelen (gemeente, Wlz, Jeugdwet)", soort: "toeslag", freq: "maand", wanneer: function (L) { return L.beperking; } },
  { code: "overig", label: "Overig inkomen (eigen omschrijving)", soort: "overig", freq: "maand", wanneer: function () { return true; } }
];
function bronCat(code) { return BRON_CAT.filter(function (x) { return x.code === code; })[0]; }
var SOORT_NAAM = { loon: "Loon of winst", uitkering: "Uitkering", pensioen: "Pensioen", overig: "Overig inkomen", toeslag: "Toeslag of vergoeding (belastingvrij)", aow: "AOW", pot: "Pensioenpot" };
var INDEX_KEUZES = [["cpi", "Prijsindex (CPI)"], ["vast", "Vast percentage (bijv. cao)"], ["geen", "Geen indexatie"]];

/* ---------- Lasten: vaste omschrijvingen, gefilterd op de intake ---------- */
var LASTEN_GROEPEN = ["Wonen", "Vervoer", "Zorg en verzekeringen", "Gezin", "Overig"];
function isHK(L) { return L.woning === "huur" || L.woning === "koop"; }
var LASTEN_CAT = [
  { code: "huur", groep: "Wonen", label: "Kale huur", freq: "maand", index: "cpi", wanneer: function (L) { return L.woning === "huur"; } },
  { code: "huur_service", groep: "Wonen", label: "Servicekosten huurwoning", freq: "maand", index: "cpi", wanneer: function (L) { return L.woning === "huur"; } },
  { code: "opstal", groep: "Wonen", label: "Opstalverzekering", freq: "maand", index: "cpi", wanneer: function (L) { return L.woning === "koop"; } },
  { code: "ozb", groep: "Wonen", label: "Onroerendezaakbelasting (OZB)", freq: "jaar", index: "cpi", wanneer: function (L) { return L.woning === "koop"; } },
  { code: "waterschap", groep: "Wonen", label: "Waterschapsbelasting", freq: "jaar", index: "cpi", wanneer: function (L) { return L.woning === "koop"; } },
  { code: "afval_riool", groep: "Wonen", label: "Afvalstoffenheffing en rioolheffing", freq: "jaar", index: "cpi", wanneer: function (L) { return isHK(L); } },
  { code: "vve", groep: "Wonen", label: "VvE-bijdrage (appartement)", freq: "maand", index: "cpi", wanneer: function (L) { return L.woning === "koop"; } },
  { code: "erfpacht", groep: "Wonen", label: "Erfpacht", freq: "maand", index: "cpi", wanneer: function (L) { return L.woning === "koop"; } },
  { code: "onderhoud_woning", groep: "Wonen", label: "Onderhoud en reparaties woning", freq: "jaar", index: "cpi", wanneer: function (L) { return L.woning === "koop"; } },
  { code: "woonbijdrage", groep: "Wonen", label: "Bijdrage woonkosten (inwonend, kamer of anders)", freq: "maand", index: "cpi", wanneer: function (L) { return L.woning === "geen"; } },
  { code: "energie", groep: "Wonen", label: "Gas, elektriciteit en stadsverwarming", freq: "maand", index: "cpi", wanneer: function (L) { return isHK(L); } },
  { code: "water", groep: "Wonen", label: "Water", freq: "maand", index: "cpi", wanneer: function (L) { return isHK(L); } },
  { code: "inboedel", groep: "Wonen", label: "Inboedelverzekering", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "aansprakelijk", groep: "Wonen", label: "Aansprakelijkheidsverzekering", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "internet", groep: "Wonen", label: "Internet en televisie", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "mobiel", groep: "Wonen", label: "Mobiele telefoon", freq: "maand", index: "cpi", per: true, wanneer: function () { return true; } },
  { code: "auto_belasting", groep: "Vervoer", label: "Motorrijtuigenbelasting", freq: "kwartaal", index: "cpi", perAuto: "eigen", wanneer: function (L) { return L.eigen > 0; } },
  { code: "auto_verz", groep: "Vervoer", label: "Autoverzekering", freq: "maand", index: "cpi", perAuto: "eigen", wanneer: function (L) { return L.eigen > 0; } },
  { code: "auto_brandstof", groep: "Vervoer", label: "Brandstof of laden", freq: "maand", index: "cpi", perAuto: "alle", wanneer: function (L) { return L.auto; } },
  { code: "auto_onderhoud", groep: "Vervoer", label: "Onderhoud en APK", freq: "jaar", index: "cpi", perAuto: "eigen", wanneer: function (L) { return L.eigen > 0; } },
  { code: "auto_vervanging", groep: "Vervoer", label: "Sparen voor vervanging van de auto", freq: "maand", index: "cpi", perAuto: "eigen", wanneer: function (L) { return L.eigen > 0; } },
  { code: "auto_lease", groep: "Vervoer", label: "Leasetermijn auto", freq: "maand", index: "cpi", perAuto: "lease", wanneer: function (L) { return L.lease > 0; } },
  { code: "auto_parkeer", groep: "Vervoer", label: "Parkeren", freq: "maand", index: "cpi", perAuto: "alle", wanneer: function (L) { return L.auto; } },
  { code: "deelauto", groep: "Vervoer", label: "Deelauto en taxi", freq: "maand", index: "cpi", wanneer: function (L) { return L.deel || L.geenAuto; } },
  { code: "ov", groep: "Vervoer", label: "Openbaar vervoer", freq: "maand", index: "cpi", per: true, wanneer: function () { return true; } },
  { code: "fiets", groep: "Vervoer", label: "Fiets (onderhoud en verzekering)", freq: "jaar", index: "cpi", wanneer: function () { return true; } },
  { code: "zorgverz", groep: "Zorg en verzekeringen", label: "Zorgverzekering (basis)", freq: "maand", index: "cpi", per: true, wanneer: function () { return true; } },
  { code: "zorg_aanv", groep: "Zorg en verzekeringen", label: "Aanvullende zorgverzekering en tandarts", freq: "maand", index: "cpi", per: true, wanneer: function () { return true; } },
  { code: "eigen_risico", groep: "Zorg en verzekeringen", label: "Eigen risico en eigen bijdragen zorg", freq: "jaar", index: "cpi", per: true, wanneer: function () { return true; } },
  { code: "levensverz", groep: "Zorg en verzekeringen", label: "Overlijdensrisico- of uitvaartverzekering", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "arbeidsong", groep: "Zorg en verzekeringen", label: "Arbeidsongeschiktheidsverzekering", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "rechtsbijstand", groep: "Zorg en verzekeringen", label: "Rechtsbijstandverzekering", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "kinderopvang", groep: "Gezin", label: "Kinderopvang (eigen bijdrage na toeslag)", freq: "maand", index: "cpi", wanneer: function (L) { return L.kinderen > 0 && L.opvang; } },
  { code: "school", groep: "Gezin", label: "Schoolbijdragen en ouderbijdragen", freq: "jaar", index: "cpi", wanneer: function (L) { return L.kinderen > 0; } },
  { code: "studiekosten", groep: "Gezin", label: "Collegegeld en studiekosten", freq: "jaar", index: "cpi", wanneer: function (L) { return L.kinderen > 0 && L.studerend; } },
  { code: "zakgeld", groep: "Gezin", label: "Zakgeld kinderen", freq: "maand", index: "cpi", wanneer: function (L) { return L.kinderen > 0; } },
  { code: "sport_kind", groep: "Gezin", label: "Sport en clubs kinderen", freq: "maand", index: "cpi", wanneer: function (L) { return L.kinderen > 0; } },
  { code: "zorg_kind", groep: "Gezin", label: "Extra zorgkosten kind (hulpmiddelen, begeleiding, eigen bijdragen)", freq: "maand", index: "cpi", wanneer: function (L) { return L.beperking; } },
  { code: "vervoer_kind", groep: "Gezin", label: "Aangepast vervoer en reiskosten voor zorg", freq: "maand", index: "cpi", wanneer: function (L) { return L.beperking; } },
  { code: "kinderalim", groep: "Gezin", label: "Kinderalimentatie (betaald)", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "partneralim", groep: "Gezin", label: "Partneralimentatie (betaald)", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "huisdier", groep: "Overig", label: "Huisdier (voer, dierenarts, verzekering)", freq: "maand", index: "cpi", wanneer: function (L) { return L.huisdier; } },
  { code: "abonnementen", groep: "Overig", label: "Abonnementen (streaming, kranten, muziek)", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "sport", groep: "Overig", label: "Sport en hobby's", freq: "maand", index: "cpi", per: true, wanneer: function () { return true; } },
  { code: "studieschuld", groep: "Overig", label: "Aflossing studieschuld", freq: "maand", index: "geen", wanneer: function () { return true; } },
  { code: "lening", groep: "Overig", label: "Aflossing lening of krediet", freq: "maand", index: "geen", wanneer: function () { return true; } },
  { code: "contributies", groep: "Overig", label: "Contributies en donaties", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "bankkosten", groep: "Overig", label: "Bankkosten", freq: "maand", index: "cpi", wanneer: function () { return true; } },
  { code: "belasting_na", groep: "Overig", label: "Belastingaanslagen (voorlopige aanslag, naheffing)", freq: "jaar", index: "geen", wanneer: function () { return true; } }
];
function lastCat(code) { return LASTEN_CAT.filter(function (x) { return x.code === code; })[0]; }
function aantalAutos(l, soort) {
  var v = l[soort];
  if (v !== undefined && v !== "" && v !== null) return Math.max(0, Math.round(Number(v)) || 0);
  if (soort === "eigen") return (l.auto === "eigen" || l.auto === "beide") ? 1 : 0;
  return (l.auto === "lease" || l.auto === "beide") ? 1 : 0;
}
function lijstL(profiel) {
  var l = profiel.leef || {};
  var eigen = aantalAutos(l, "eigen"), lease = aantalAutos(l, "lease");
  var kids = (profiel.kids || []).filter(function (k) { return k; });
  var n = kids.length ? kids.length : (Number(l.kinderen) || 0);
  return { woning: l.woning, eigen: eigen, lease: lease, auto: eigen + lease > 0, deel: !!l.deel, geenAuto: eigen + lease === 0, kinderen: n,
    opvang: kids.length ? kids.some(function (k) { return k.opvang; }) : !!l.opvang, studerend: kids.length ? kids.some(function (k) { return k.studerend; }) : !!l.studerend,
    kbAuto: profiel.kinderbijslagAuto !== false && kids.some(function (k) { return !!geldigeDatum(k.geboorte); }),
    beperking: kids.some(function (k) { return k.beperking; }),
    huisdier: !!l.huisdier, partner: !!profiel.partner };
}
// De auto's van het huishouden, elk met een eigen id en naam (voor lasten per auto).
function autosVan(L) {
  var uit = [], n = L.eigen + L.lease;
  for (var i = 1; i <= L.eigen; i++) uit.push({ id: "e" + i, soort: "eigen", naam: L.eigen > 1 ? "eigen auto " + i : "eigen auto", toon: n > 1 });
  for (var j = 1; j <= L.lease; j++) uit.push({ id: "l" + j, soort: "lease", naam: L.lease > 1 ? "leaseauto " + j : "leaseauto", toon: n > 1 });
  return uit;
}

var RESERVERING_NAMEN = ["Vakantie", "Vervanging auto", "Onderhoud woning", "Verbouwing", "Kinderen en studie", "Cadeaus en feestdagen", "Zorgkosten", "Hobby en sport", "Belastingen", "Aanvulling pensioen"];
var BOEKING_NAMEN = ["Verbouwing of groot onderhoud woning", "Nieuwe auto", "Vakantie", "Erfenis of schenking", "Bonus of eenmalige uitkering", "Verkoop van een bezit", "Studiekosten", "Bruiloft of jubileum", "Medische kosten", "Aflossing lening", "Belastingteruggave of naheffing", "Schenking aan kinderen"];
var DEPOSITO_BANKEN_HINT = "Alleen de naam van de bank, geen rekeningnummer.";
