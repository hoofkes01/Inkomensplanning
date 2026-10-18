/* ===== Kansen: waar kan de klant geld besparen of erbij krijgen? Alleen berekend uit de eigen gegevens van de klant. ===== */
var KANSEN_GROEPEN = [["tijd", "Nu of binnenkort doen"], ["toeslag", "Toeslagen en regelingen"], ["rente", "Meer rente op spaargeld"], ["schuld", "Hypotheek en schulden"], ["lasten", "Lagere lasten"], ["reserveren", "Reserveren voor grote uitgaven"], ["inkomen", "Inkomen"], ["risico", "Risico's die geld kosten"]];
var LASTEN_TIPS = {
  zorgverz: "Vergelijk elk najaar de basisverzekering. Overstappen kan tot en met 31 januari, met ingang van 1 januari.",
  zorg_aanv: "Kijk of je de aanvullende dekking echt gebruikt (fysio, tandarts, bril). Zo niet, dan is een lagere dekking goedkoper.",
  energie: "Kies bewust: een vast contract geeft zekerheid, een variabel contract volgt de markt. Noteer de einddatum van je contract, vergelijk 2 tot 3 maanden daarvoor en controleer of het voorschot past bij je werkelijke verbruik.",
  internet: "Internet en tv: vergelijk aanbieders en zeg tv-pakketten of zenders op die je niet kijkt. Na de actieperiode stijgt de prijs vaak; vraag dan om een nieuw aanbod of stap over.",
  mobiel: "Kies een sim-only abonnement met een databundel die past bij je gebruik. Dat is vaak goedkoper dan een abonnement met toestel; maandelijks opzegbaar is flexibel.",
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

  // Marktrente die de gebruiker zelf invult (bijvoorbeeld het beste tarief dat Raisin nu toont)
  var mSp = S.inst.marktSpaar === "" || S.inst.marktSpaar == null ? null : getal(S.inst.marktSpaar);
  var mDe = S.inst.marktDepo === "" || S.inst.marktDepo == null ? null : getal(S.inst.marktDepo);
  if (mSp !== null && (bestSpaar === null || mSp > bestSpaar)) { bestSpaar = mSp; bestSpaarNaam = "marktrente die je invulde"; }
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
  if (mDe === null && over >= 5000 && bestSpaar !== null && best.rente - bestSpaar >= 0.25)
    add("rente", "Spaargeld boven je buffer kan vastgezet worden", eur(over) + " staat boven je buffer van " + eur(buffer) + ". Je beste depositorente (" + pct(best.rente, 2) + ", " + best.bron + ") ligt boven je beste spaarrente (" + pct(bestSpaar, 2) + "). Een deel vastzetten kan dus meer opleveren, als je het geld zeker niet nodig hebt tijdens de looptijd.", { sterkte: "midden", menu: "vermogen" });
  else if (mDe === null && over >= 5000 && !(S.profiel.gebruik.deposito && (S.verm.deposito || []).length) && !(S.profiel.gebruik.beleggen && (S.verm.beleggingen || []).length))
    add("rente", "Spaargeld boven je buffer", eur(over) + " staat boven je buffer van " + eur(buffer) + ". Vergelijk actuele spaar- en depositotarieven (bijvoorbeeld via Raisin), of kies bij Dashboard voor deposito's of beleggen als je langer kunt vastzetten.", { sterkte: "midden", menu: "vermogen" });


  var heeftRaisin = rek.concat(S.verm.deposito || []).some(function (r) { return /raisin/i.test(r.bank || ""); });
  var tegoed = spaar + (S.verm.deposito || []).reduce(function (a, d) { return a + getal(d.bedrag); }, 0);
  if (tegoed >= 10000 && !heeftRaisin)
    add("rente", "Vergelijk spaar- en depositorentes bij Raisin", "Via Raisin kun je met één account sparen en deposito's afsluiten bij banken in andere EU-landen, vaak tegen een hogere rente. Je betaalt in Nederland gewoon box 3 over je vermogen. Kies bij voorkeur banken in landen zonder standaard bronbelasting (bijvoorbeeld Duitsland of Frankrijk) of lever de vrijstellingsverklaring in, anders kan het land belasting op de rente inhouden. De depositogarantie is 100.000 per persoon per bank, onder het stelsel van het land van de bank. Vul hieronder het beste tarief in dat je nu ziet; dan rekent de app het voordeel uit.", { sterkte: "midden", menu: "vermogen", url: "https://www.raisin.com/nl-nl/" });
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
  if (mDe !== null && rest >= 5000) {
    var basisRente = getal(m.inst.spaarrente);
    var basisD = mDe - basisRente;
    if (basisD >= 0.25) add("rente", "Spaargeld boven je buffer vastzetten tegen " + pct(mDe, 2), eur(rest) + " staat boven je buffer en is niet nodig voor aflossen. Tegen de depositorente die je invulde levert vastzetten circa " + eur(rest * basisD / 100) + " per jaar meer op dan nu, vóór belasting. Alleen voor geld dat je tijdens de looptijd niet nodig hebt.", { jaar: rest * basisD / 100, sterkte: "hoog", menu: "vermogen" });
  }
  hypRisico(m).forEach(function (r) {
    if (r.variabel) { add("schuld", r.naam + ": variabele rente", "Bij een variabele rente kan je maandlast elk moment stijgen (bij 1 procentpunt circa " + eur(r.impact) + " per maand). Bespreek met je hypotheekadviseur of vastzetten verstandig is.", { sterkte: "midden", menu: "pensioen" }); return; }
    if (r.onbekend || r.dagen == null || r.dagen < 0 || r.maanden > 24) return;
    var dichtbij = r.maanden <= 9;
    add(dichtbij ? "tijd" : "schuld", r.naam + ": neem op tijd contact op met je hypotheekadviseur", "De rente wordt herzien op " + fmtDatum(r.datum) + " (over " + r.maanden + " maanden). " + (dichtbij ? "Plan nu een gesprek: " : "Zet het in je agenda: ") + "vergelijk het rentevoorstel van je geldverstrekker met andere aanbieders en bespreek rentemiddeling, extra aflossen of oversluiten. Bij 1 procentpunt verschil is dat circa " + eur(r.impact * 12) + " per jaar. Houd rekening met boeterente.", { sterkte: dichtbij ? "hoog" : "midden", menu: "pensioen" });
  });

  var mnd = m.nu.getMonth(), seizoen = mnd >= 10 || mnd === 0;
  var zvPost = (m.lasten || []).filter(function (p) { return p.code === "zorgverz"; });
  var zvJaar = zvPost.reduce(function (a, p) { return a + getal(p.bedrag) * (FREQ_PER_JAAR[p.freq || "maand"] || 12); }, 0);
  add(seizoen ? "tijd" : "lasten", mnd === 0 ? "Zorgverzekering: tot en met 31 januari nog overstappen" : seizoen ? "Zorgverzekering: nu vergelijken" : "Zorgverzekering: zet november in je agenda",
    (mnd === 0 ? "Je kunt tot en met 31 januari nog overstappen, met terugwerkende kracht per 1 januari. " : seizoen ? "De verzekeraars maken de premies voor volgend jaar bekend. Vergelijk basis en aanvullende verzekering en stap over vóór 1 januari, of uiterlijk 31 januari. " : "In november maken verzekeraars de premies voor het volgende jaar bekend. Vergelijk dan basis en aanvullende verzekering; overstappen kan tot en met 31 januari. ") + "Kijk ook of je aanvullende dekking nog past bij je gebruik en je eigen risico." + (zvJaar > 0 ? " Je betaalt nu circa " + eur(zvJaar) + " per jaar." : ""),
    { sterkte: seizoen ? "hoog" : "check", menu: "lasten" });
  // Lasten: de grootste posten waar vergelijken zin heeft.
  var lasten = [], verz = [];
  var VERZ = ["opstal", "inboedel", "aansprakelijk", "rechtsbijstand", "auto_verz", "levensverz", "arbeidsong", "zorg_aanv"];
  (m.lasten || []).forEach(function (p) {
    if (!LASTEN_TIPS[p.code]) return;
    var jaar = getal(p.bedrag) * (FREQ_PER_JAAR[p.freq || "maand"] || 12);
    var item = { code: p.code, label: (lastCat(p.code) || {}).label || p.omschrijving || p.code, jaar: jaar };
    if (VERZ.indexOf(p.code) >= 0) { if (jaar > 0) verz.push(item); }
    else if (jaar >= 120) lasten.push(item);
  });
  if (verz.length) {
    var vt = verz.reduce(function (a, x) { return a + x.jaar; }, 0);
    add("lasten", "Verzekeringen doorlopen: " + eur(vt) + " per jaar", "Loop je verzekeringen één keer per jaar langs: " + verz.map(function (x) { return x.label.toLowerCase() + " (" + eur(x.jaar) + ")"; }).join(", ") + ". Vergelijk premies, schrap dubbele of overbodige dekking en combineer waar het voordeliger is. Zorg dat een verzekering na een verhuizing, nieuwe auto of gezinsuitbreiding nog past.", { menu: "lasten" });
  }
  lasten = lasten.filter(function (l) { return l.code !== "zorgverz"; });
  lasten.sort(function (a, b) { return b.jaar - a.jaar; }).slice(0, 6).forEach(function (l) {
    add("lasten", l.label + ": " + eur(l.jaar) + " per jaar", LASTEN_TIPS[l.code], { menu: "lasten" });
  });
  var dg = getal((m.dagelijks || {}).bedrag) * 12;
  if (dg > 0) add("lasten", "Dagelijkse uitgaven: " + eur(dg) + " per jaar", "Houd een maand lang bij waar het geld naartoe gaat. Kleine posten (abonnementen, boodschappen, horeca) lopen vaak het hardst op.", { menu: "lasten" });

  // Reserveren voor grote uitgaven
  var resNu = reserveringMaandTotaal(m, m.nu), res = (S.grote.reserveringen || []);
  (S.grote.boekingen || []).forEach(function (b) {
    var d = geldigeDatum(b.datum), bd = getal(b.bedrag);
    if (b.type !== "uitgave" || !d || bd < 500 || b.reserveringId) return;
    var mnd2 = maandenTussen(m.nu, d);
    if (mnd2 < 1 || mnd2 > 60) return;
    add("reserveren", (b.omschrijving || "Grote uitgave") + ": reserveer " + eur(bd / mnd2) + " per maand", "Op " + fmtDatum(d) + " staat een uitgave van " + eur(bd) + " gepland, over " + mnd2 + " maanden. Als je nu maandelijks " + eur(bd / mnd2) + " opzij zet, kom je dat moment niet in de problemen. Maak een reservering aan bij Grote inkomsten en uitgaven en koppel de uitgave eraan.", { sterkte: "hoog", menu: "grote" });
  });
  function heeftRes(woord, code) { return res.some(function (r) { return new RegExp(woord, "i").test(r.naam || ""); }) || (m.lasten || []).some(function (p) { return p.code === code; }); }
  var L2 = lijstL(S.profiel);
  if (L2.woning === "koop" && !heeftRes("onderhoud|verbouw", "onderhoud_woning")) add("reserveren", "Reserveer maandelijks voor onderhoud aan je woning", "Een koopwoning vraagt steeds onderhoud (schilderwerk, dak, cv-ketel, keuken). Zet daarvoor elke maand een vast bedrag opzij in plaats van het uit een spaarpot te halen.", { menu: "grote" });
  if (L2.eigen > 0 && !heeftRes("auto|vervanging", "auto_vervanging")) add("reserveren", "Reserveer maandelijks voor de vervanging van je auto", "Een auto moet ooit worden vervangen en dat kost een groot bedrag in één keer. Een vast maandbedrag voorkomt dat je dan je spaargeld of een lening nodig hebt.", { menu: "grote" });
  var saldo0 = fasenLijst(m)[0];
  if (saldo0 && saldo0.saldo > 100 && resNu < saldo0.saldo * 0.2) add("reserveren", "Je houdt per maand ruimte over: zet een deel opzij", "Volgens de planning houd je nu gemiddeld " + eur(saldo0.saldo) + " per maand over, en reserveer je " + eur(resNu) + ". Maak een vast bedrag over voor vakantie, onderhoud, vervanging en onverwachte kosten. Zo stuurt je planning zelf bij in plaats van dat je uitgaven je verrassen.", { sterkte: "midden", menu: "grote" });

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
function kansenTop(lijst, n) {
  var volg = { hoog: 0, midden: 1, check: 2 };
  return lijst.map(function (k, i) { return { k: k, i: i }; }).sort(function (a, b) { return (volg[a.k.sterkte] - volg[b.k.sterkte]) || (a.i - b.i); }).slice(0, n).map(function (x) { return x.k; });
}
function MarktrenteVelden() {
  var c = useC(), I = c.S.inst, oud = I.marktDatum && ouderDan(I.marktDatum, 30, c.m.nu);
  function zet(patch) { c.zet("inst", Object.assign({ marktDatum: isoDatum(vandaag()) }, patch)); }
  return h("details", { "data-blok": "marktrente" }, h("summary", { className: "klein" }, "Beste rentes die je nu ziet invullen (bijvoorbeeld op Raisin)"),
    h("p", { className: "klein" }, "Kijk zelf op de website van de aanbieder en vul het beste tarief in dat je nu kunt krijgen. De app rekent dan uit wat overstappen of vastzetten per jaar oplevert. Laat leeg als je het niet weet."),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Beste spaarrente (%)", value: I.marktSpaar, pct: true, onChange: function (v) { zet({ marktSpaar: v }); }, naam: "markt-spaar" }),
      h(BedragVeld, { label: "Beste depositorente (%)", value: I.marktDepo, pct: true, onChange: function (v) { zet({ marktDepo: v }); }, naam: "markt-depo" })),
    I.marktDatum ? h("p", { className: oud ? "oranje klein" : "klein" }, "Ingevuld op " + fmtDatum(I.marktDatum) + (oud ? ". Dit is ouder dan een maand: controleer de tarieven opnieuw." : ".")) : null);
}
function KansenKaart() {
  var c = useC(), lijst = kansen(c);
  if (!lijst.length) return null;
  var tot = kansenTotaal(lijst);
  return h(Kaart, { titel: "Kansen: wat kan het opleveren?" },
    h("p", { className: "klein" }, lijst.length + (lijst.length === 1 ? " kans" : " kansen") + " gevonden" + (tot > 0 ? ", waarvan berekend circa " + eur(tot) + " per jaar" : "") + ". Hieronder de belangrijkste; het volledige overzicht staat in het rapport."),
    h(KansenLijst, { lijst: kansenTop(lijst, 4) }),
    h(MarktrenteVelden, null),
    h("div", { className: "rij" }, h(Knop, { soort: "sec", onClick: function () { c.nav("rapport"); }, naam: "naar-kansen" }, "Naar het rapport")));
}
