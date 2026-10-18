/* ===== Kansen: waar kan de klant geld besparen of erbij krijgen? Alleen berekend uit de eigen gegevens van de klant. ===== */
var KANSEN_GROEPEN = [["toeslag", "Toeslagen en regelingen"], ["rente", "Meer rente op spaargeld"], ["schuld", "Hypotheek en schulden"], ["lasten", "Lagere lasten"], ["inkomen", "Inkomen"], ["risico", "Risico's die geld kosten"]];
var LASTEN_TIPS = {
  zorgverz: "Vergelijk elk najaar de basisverzekering. Overstappen kan tot en met 31 januari, met ingang van 1 januari.",
  zorg_aanv: "Kijk of je de aanvullende dekking echt gebruikt (fysio, tandarts, bril). Zo niet, dan is een lagere dekking goedkoper.",
  energie: "Vergelijk vast en variabel contract en controleer of het voorschot past bij je werkelijke verbruik.",
  internet: "Vergelijk aanbieders en controleer of je nog betaalt voor een pakket dat je niet gebruikt.",
  mobiel: "Overweeg een sim-only abonnement; vaak goedkoper dan een abonnement met toestel.",
  opstal: "Vergelijk premies en dekking; bij een lagere herbouwwaarde of hoger eigen risico daalt de premie.",
  inboedel: "Vergelijk premies en combineer waar mogelijk bij één verzekeraar.",
  aansprakelijk: "Eén aansprakelijkheidsverzekering per huishouden is genoeg. Controleer of je niet dubbel verzekerd bent.",
  rechtsbijstand: "Controleer of je de dekking nodig hebt; soms zit die al in een andere polis of via je werkgever.",
  auto_verz: "Vergelijk jaarlijks de premie en de dekking (WA, beperkt casco of allrisk) bij de leeftijd van de auto.",
  levensverz: "Controleer of het verzekerde bedrag nog past bij je hypotheek en gezin; vergelijk premies.",
  arbeidsong: "Controleer dekking en premie; vergelijk bij een einddatum van de polis.",
  abonnementen: "Zeg abonnementen op die je niet of nauwelijks gebruikt en deel accounts waar dat mag.",
  bankkosten: "Vergelijk de kosten van je betaalrekening; er zijn rekeningen zonder kosten.",
  lening: "Vraag een offerte voor goedkopere herfinanciering of los extra af als je spaargeld boven je buffer staat."
};
function kansen(c) {
  var m = c.m, S = c.S, uit = [];
  function add(groep, titel, tekst, extra) { uit.push(Object.assign({ groep: groep, titel: titel, tekst: tekst, jaar: null, sterkte: "check", menu: "dashboard" }, extra || {})); }
  if (!(S.intake.dashboard || {}).klaar) return uit;
  var buffer = getal(S.grote.minimum), rek = (m.verm.rekeningen || []);
  var spaar = rek.reduce(function (s, r) { return s + getal(r.saldo); }, 0);
  var best = eigenBesteRente(m), over = Math.max(0, spaar - buffer);
  var bestSpaar = null, bestSpaarNaam = "";
  rek.forEach(function (r) { if (r.rente === "" || r.rente == null) return; var x = getal(r.rente); if (bestSpaar === null || x > bestSpaar) { bestSpaar = x; bestSpaarNaam = (r.bank || "spaarrekening"); } });

  // Toeslagen
  toeslagKandidaten(c).kandidaten.forEach(function (k) {
    if (k.antwoord === "ja" || k.antwoord === "geen") return;
    add("toeslag", k.label + (k.sterkte === "waarschijnlijk" ? ": waarschijnlijk recht" : ": onderzoek of je recht hebt"), k.reden + " Aanvragen of laten berekenen via " + k.aanvraag.tekst + ".", { sterkte: k.sterkte === "waarschijnlijk" ? "hoog" : "check", menu: "inkomen", url: k.aanvraag.url });
  });

  // Rente op spaarrekeningen
  var zonderRente = 0;
  rek.forEach(function (r) {
    var sd = getal(r.saldo);
    if (sd < 1000) return;
    if (r.rente === "" || r.rente == null) { zonderRente++; return; }
    var diff = bestSpaar === null ? 0 : bestSpaar - getal(r.rente);
    if (diff >= 0.25) add("rente", (r.bank || "Spaarrekening") + ": lagere rente dan je beste spaarrekening", "Hier staat " + eur(sd) + " tegen " + pct(r.rente, 2) + ". Je beste spaarrekening geeft " + pct(bestSpaar, 2) + " (" + bestSpaarNaam + "). Verplaatsen levert circa " + eur(sd * diff / 100) + " per jaar op, vóór belasting. Let op de depositogarantie van 100.000 per persoon per bank.", { jaar: sd * diff / 100, sterkte: sd * diff / 100 >= 100 ? "hoog" : "midden", menu: "vermogen" });
  });
  if (zonderRente) add("rente", "Vul de werkelijke rente van je spaarrekeningen in", zonderRente + (zonderRente === 1 ? " rekening heeft" : " rekeningen hebben") + " nog geen eigen rentepercentage; de app rekent met de standaard spaarrente van " + pct(m.spaarStandaard, 2) + ". Met de echte rente ziet de app of verplaatsen loont.", { menu: "vermogen" });
  if (over >= 5000 && bestSpaar !== null && best.rente - bestSpaar >= 0.25)
    add("rente", "Spaargeld boven je buffer kan vastgezet worden", eur(over) + " staat boven je buffer van " + eur(buffer) + ". Je beste depositorente (" + pct(best.rente, 2) + ", " + best.bron + ") ligt boven je beste spaarrente (" + pct(bestSpaar, 2) + "). Een deel vastzetten kan dus meer opleveren, als je het geld zeker niet nodig hebt tijdens de looptijd.", { sterkte: "midden", menu: "vermogen" });
  else if (over >= 5000 && !(S.profiel.gebruik.deposito && (S.verm.deposito || []).length) && !(S.profiel.gebruik.beleggen && (S.verm.beleggingen || []).length))
    add("rente", "Spaargeld boven je buffer", eur(over) + " staat boven je buffer van " + eur(buffer) + ". Vergelijk actuele spaar- en depositotarieven (bijvoorbeeld via Raisin), of kies bij Dashboard voor deposito's of beleggen als je langer kunt vastzetten.", { sterkte: "midden", menu: "vermogen" });

  // Hypotheek en schulden: extra aflossen uit spaargeld boven de buffer, als de rente hoger is dan wat het spaargeld oplevert.
  var kand = [];
  (S.verm.schulden || []).forEach(function (s) {
    if (s.soort === "uitstaand" || !(getal(s.bedrag) > 0)) return;
    if (s.rente === "" || s.rente == null) { add("schuld", (s.naam || "Schuld") + ": rente ontbreekt", "Vul de rente in. Dan kan de app zien of aflossen uit spaargeld loont.", { menu: "vermogen" }); return; }
    var d = getal(s.rente) - best.rente;
    if (d >= 1) kand.push({ naam: s.naam || "Schuld", saldo: getal(s.bedrag), rente: getal(s.rente), diff: d, soort: "schuld" });
  });
  if (m.profiel.gebruik.hypotheek) ((m.hyp || {}).delen || []).forEach(function (dl, i) {
    var saldo = hypDeelOp(m, dl, m.peil).saldo;
    if (!(saldo > 0)) return;
    if (dl.box === "3") { var d = getal(dl.rente) - best.rente; if (d >= 1) kand.push({ naam: "Hypotheekdeel " + (i + 1) + " (box 3)", saldo: saldo, rente: getal(dl.rente), diff: d, soort: "hyp3" }); }
  });
  kand.sort(function (a, b) { return b.diff - a.diff; });
  var rest = over;
  kand.forEach(function (k) {
    if (rest < 500) return;
    var bedrag = Math.min(rest, k.saldo); rest -= bedrag;
    add("schuld", k.naam + ": aflossen loont", "De rente is " + pct(k.rente, 2) + ", je spaargeld levert maximaal " + pct(best.rente, 2) + ". Van het spaargeld boven je buffer kun je " + eur(bedrag) + " gebruiken om af te lossen: circa " + eur(bedrag * k.diff / 100) + " per jaar voordeliger (bruto)." + (k.soort === "hyp3" ? " Controleer de boetevrije ruimte bij extra aflossen." : ""), { jaar: bedrag * k.diff / 100, sterkte: "hoog", menu: "vermogen" });
  });
  hypRisico(m).forEach(function (r) {
    if (r.variabel || r.onbekend || r.dagen == null || r.dagen < 0 || r.maanden > 24) return;
    add("schuld", r.naam + ": rente vergelijken voor de herziening", "De rente wordt herzien op " + fmtDatum(r.datum) + ". Vraag ruim van tevoren een rentevoorstel en vergelijk dat met andere aanbieders. Bij 1 procentpunt verschil is dat circa " + eur(r.impact * 12) + " per jaar. Houd rekening met boeterente bij oversluiten.", { jaar: null, sterkte: "midden", menu: "pensioen" });
  });

  // Lasten: de grootste posten waar vergelijken zin heeft.
  var lasten = [];
  (m.lasten || []).forEach(function (p) {
    if (!LASTEN_TIPS[p.code]) return;
    var jaar = getal(p.bedrag) * (FREQ_PER_JAAR[p.freq || "maand"] || 12);
    if (jaar >= 120) lasten.push({ code: p.code, label: (lastCat(p.code) || {}).label || p.omschrijving || p.code, jaar: jaar });
  });
  lasten.sort(function (a, b) { return b.jaar - a.jaar; }).slice(0, 6).forEach(function (l) {
    add("lasten", l.label + ": " + eur(l.jaar) + " per jaar", LASTEN_TIPS[l.code], { menu: "lasten" });
  });
  var dg = getal((m.dagelijks || {}).bedrag) * 12;
  if (dg > 0) add("lasten", "Dagelijkse uitgaven: " + eur(dg) + " per jaar", "Houd een maand lang bij waar het geld naartoe gaat. Kleine posten (abonnementen, boodschappen, horeca) lopen vaak het hardst op.", { menu: "lasten" });

  // Inkomen: waar zit een gat?
  var fasen = fasenLijst(m);
  fasen.filter(function (f) { return f.saldo < -50; }).slice(0, 2).forEach(function (f) {
    add("inkomen", "Tekort in fase '" + f.naam + "' (vanaf " + fmtMaand(f.d) + ")", "In deze periode is het saldo " + eur(f.saldo) + " per maand. Dat kan met meer inkomen (bijvoorbeeld langer werken, bijverdienen, uitkering of toeslag), lagere lasten of een inkomensaanvulling uit vermogen.", { sterkte: "hoog", menu: "dashboard" });
  });

  // Risico's
  var banken = {}, nPers = Math.max(1, m.personen.length);
  rek.forEach(function (r) { var k = (r.bank || "").trim().toLowerCase(); if (k) banken[k] = (banken[k] || 0) + getal(r.saldo); });
  (S.verm.deposito || []).forEach(function (d) { var k = (d.bank || "").trim().toLowerCase(); if (k) banken[k] = (banken[k] || 0) + getal(d.bedrag); });
  Object.keys(banken).forEach(function (k) {
    if (banken[k] > 100000 * nPers) add("risico", "Meer dan de depositogarantie bij één bank", "Bij " + k + " staat " + eur(banken[k]) + ". De garantie is 100.000 per persoon per bank. Verdeel het bedrag over meer banken.", { sterkte: "hoog", menu: "vermogen" });
  });
  return uit;
}
function kansenTotaal(lijst) { return lijst.reduce(function (s, k) { return s + (k.jaar || 0); }, 0); }

function KansenLijst(p) {
  var lijst = p.lijst, tot = kansenTotaal(lijst);
  if (!lijst.length) return h("p", null, "Op basis van de ingevulde gegevens zijn er nu geen concrete kansen gevonden. Vul de intake en de rentepercentages volledig in voor een scherper beeld.");
  var badge = { hoog: ["Hoge prioriteit", "waarschuw"], midden: ["Kans", ""], check: ["Onderzoeken", ""] };
  return h("div", { "data-kansen": "1" },
    tot > 0 ? h("p", null, h("b", null, "Berekende voordelen samen: circa " + eur(tot) + " per jaar"), " (bruto, op basis van de ingevulde gegevens; toeslagen en besparingen op lasten zijn hierin niet meegeteld).") : null,
    KANSEN_GROEPEN.map(function (g) {
      var items = lijst.filter(function (k) { return k.groep === g[0]; });
      if (!items.length) return null;
      return h("div", { key: g[0], className: "kansen-groep" }, h("h3", null, g[1]),
        h("ul", { className: "rp-lijst" }, items.map(function (k, i) {
          return h("li", { key: i }, h("b", null, k.titel), k.jaar ? h("span", null, " · circa " + eur(k.jaar) + " per jaar") : null, h("br", null), k.tekst);
        })));
    }));
}
function KansenKaart() {
  var c = useC(), lijst = kansen(c);
  if (!lijst.length) return null;
  var tot = kansenTotaal(lijst);
  return h(Kaart, { titel: "Kansen: wat kan het opleveren?" },
    h("p", { className: "klein" }, lijst.length + (lijst.length === 1 ? " kans" : " kansen") + " gevonden" + (tot > 0 ? ", waarvan berekend circa " + eur(tot) + " per jaar" : "") + ". Het volledige overzicht staat in het rapport."),
    h(KansenLijst, { lijst: lijst.slice(0, 4) }),
    h(Knop, { soort: "sec", onClick: function () { c.nav("rapport"); }, naam: "naar-kansen" }, "Naar het rapport"));
}
