/* ===== Kansen: waar kan de klant geld besparen of erbij krijgen? Alleen berekend uit de eigen gegevens van de klant. ===== */
var KANSEN_GROEPEN = [["tijd", "Nu of binnenkort doen"], ["toeslag", "Toeslagen en regelingen"], ["rente", "Meer rente op spaargeld"], ["schuld", "Hypotheek en schulden"], ["lasten", "Lagere lasten"], ["reserveren", "Reserveren voor grote uitgaven"], ["inkomen", "Inkomen"], ["belasting", "Belasting en aftrek"], ["wonen", "Wonen"], ["zekerheid", "Zekerheid en overzicht"], ["risico", "Risico's die geld kosten"]];
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
  kansenExtra(c, add);
  return uit;
}
// Aanvullende kansen en actiepunten, afhankelijk van de intake. Geen bedragen die de app niet uit de gegevens kan afleiden.
function kansenExtra(c, add) {
  var m = c.m, S = c.S, L = lijstL(S.profiel), nu = m.nu;
  var fasen = fasenLijst(m), f0 = fasen[0];
  var vi = toeslagVermogenInfo(c);
  var inkomenNu = f0 ? f0.personen.reduce(function (s, p) { return s + p.bruto; }, 0) * 12 : 0;
  var laag = inkomenNu > 0 && inkomenNu <= vi.grensInkomen;
  var koop = L.woning === "koop", huur = L.woning === "huur";
  var partner = !!S.profiel.partner;
  var leeftijden = m.personen.map(function (p) { return p.geb ? leeftijdJaren(p.geb, nu) : null; });
  var maxLeeftijd = Math.max.apply(null, leeftijden.map(function (x) { return x == null ? 0 : x; }));
  var werk = [].concat((S.profiel.werk || {}).A || [], partner ? ((S.profiel.werk || {}).B || []) : []);
  var heeftLoon = m.bronnen.some(function (b) { return b.soort === "loon"; });
  var lastenCode = function (code) { return (m.lasten || []).filter(function (p) { return p.code === code; }); };
  function jaarVan(codes) { return (m.lasten || []).filter(function (p) { return codes.indexOf(p.code) >= 0; }).reduce(function (a, p) { return a + getal(p.bedrag) * (FREQ_PER_JAAR[p.freq || "maand"] || 12); }, 0); }

  // ----- Toeslagen en regelingen
  if (laag) {
    add("toeslag", "Regelingen van je gemeente voor een laag inkomen", "Bij een laag inkomen bieden gemeenten vaak aanvullende hulp: kwijtschelding van gemeentelijke belastingen, bijzondere bijstand voor onverwachte kosten, een collectieve zorgverzekering met korting en een eenmalige of jaarlijkse extra tegemoetkoming.", { sterkte: "hoog", menu: "inkomen", actie: "Kijk op de website van je gemeente onder 'minimaregelingen' of 'geldzaken' en vraag aan wat past.", waar: "je gemeente" });
    add("toeslag", "Kwijtschelding en lagere belastingen en heffingen", "Bij een laag inkomen en weinig vermogen kun je kwijtschelding krijgen voor gemeentelijke belastingen, zoals afvalstoffenheffing en rioolheffing, en soms voor waterschapsbelasting.", { sterkte: "midden", menu: "lasten", actie: "Vraag kwijtschelding aan bij de gemeente of het waterschap, bij voorkeur voordat je de aanslag betaalt.", waar: "je gemeente en waterschap" });
  }
  if (S.profiel.kids.some(function (k) { var g = geldigeDatum(k.geboorte); return g && leeftijdJaren(g, nu) >= 12 && leeftijdJaren(g, nu) < 18; }) && laag)
    add("toeslag", "Tegemoetkoming schoolkosten voor kinderen van 12 tot 18 jaar", "Bij een laag inkomen kun je een tegemoetkoming krijgen voor schoolkosten van kinderen die naar het voortgezet onderwijs gaan.", { menu: "inkomen", actie: "Vraag de tegemoetkoming aan via DUO.", waar: "duo.nl" });
  if (L.studerend) add("toeslag", "Studerend kind: studiefinanciering en reisproduct", "Een student heeft vaak recht op een reisproduct (OV-studentenkaart) en kan een aanvullende beurs krijgen, afhankelijk van het inkomen van de ouders. Jongere studenten kunnen ook recht hebben op de tegemoetkoming schoolkosten.", { menu: "inkomen", actie: "Laat je kind studiefinanciering en reisproduct aanvragen en geef het ouderlijk inkomen tijdig door.", waar: "duo.nl" });
  var heeftToeslag = m.bronnen.some(function (b) { return b.soort === "toeslag" || /toeslag/.test(b.code || ""); });
  if (heeftToeslag) add("toeslag", "Geef wijzigingen in je inkomen of situatie meteen door", "Toeslagen worden berekend op je verwachte inkomen. Stijgt je inkomen, verhuist iemand, krijg je een kind of verandert je werk? Dan kan een te hoge toeslag achteraf worden teruggevorderd.", { sterkte: "midden", menu: "inkomen", actie: "Pas je verwachte inkomen en je gegevens direct aan in Mijn toeslagen.", waar: "toeslagen.nl" });
  if (vi.vermogen > vi.grens * 0.8 && vi.vermogen <= vi.grens && (heeftToeslag || toeslagKandidaten(c).kandidaten.length))
    add("toeslag", "Je vermogen zit dicht bij de grens voor toeslagen", "Je vermogen (circa " + eur(vi.vermogen) + ") ligt dicht bij de grens van " + eur(vi.grens) + ". Een grotere uitgave of aflossing voor 1 januari kan het verschil maken, terwijl een erfenis of schenking het recht laat vervallen.", { menu: "vermogen", actie: "Houd je vermogen op 1 januari in de gaten en reken vooraf het effect door.", waar: "toeslagen.nl (proefberekening)" });
  var aowFase = fasen.filter(function (f) { return m.personen.some(function (p) { return p.aow && f.d >= p.aow; }); })[0];
  if (aowFase && aowFase.personen.reduce(function (s, p) { return s + p.bruto; }, 0) * 12 <= vi.grensInkomen * 0.8 && vi.vermogen <= vi.grens)
    add("toeslag", "AOW is laag: onderzoek de aanvullende inkomensvoorziening (AIO)", "In de fase '" + aowFase.naam + "' ligt je inkomen laag. Heb je een gekorte AOW, bijvoorbeeld doordat je niet de volle 50 jaar in Nederland woonde, of weinig pensioen? Dan kun je recht hebben op een aanvulling van de SVB.", { sterkte: "midden", menu: "pensioen", actie: "Laat de SVB je recht berekenen, ruim voor de AOW-datum.", waar: "svb.nl" });

  // ----- Belasting en aftrek
  if (koop && m.hyp && (m.hyp.delen || []).some(function (d) { return d.box === "1" && getal(d.bedrag) > 0; }))
    add("belasting", "Vraag voorlopige teruggaaf aan voor de hypotheekrenteaftrek", "Het voordeel van de hypotheekrenteaftrek krijg je anders pas na de aangifte. Met een voorlopige teruggaaf ontvang je het elke maand, wat je maandelijkse ruimte vergroot.", { sterkte: "midden", menu: "pensioen", actie: "Vraag voorlopige teruggaaf aan of pas je voorlopige aanslag aan.", waar: "belastingdienst.nl (Mijn Belastingdienst)" });
  if (koop) add("belasting", "Controleer de WOZ-waarde van je woning", "Een te hoge WOZ-waarde verhoogt je OZB en het eigenwoningforfait. Je kunt bezwaar maken tegen de WOZ-beschikking, meestal binnen 6 weken na dagtekening.", { menu: "lasten", actie: "Vergelijk je WOZ-waarde met verkoopprijzen van vergelijkbare woningen in je buurt en maak zo nodig bezwaar.", waar: "wozwaardeloket.nl / je gemeente" });
  if (partner) add("belasting", "Verdeel aftrekposten en vermogen slim tussen partners", "Fiscale partners mogen bepaalde aftrekposten en het box 3-vermogen verdelen. Door dit slim te doen, benut je beide heffingsvrije vermogens en beide lagere schijven volledig.", { menu: "fiscaal", actie: "Kies bij de aangifte de beste verdeling; de aangifte-software rekent dit voor je uit.", waar: "belastingdienst.nl (aangifte inkomstenbelasting)" });
  var b3 = c.vr[0].items, tt = c.vr[0].t;
  var bank0 = tt.sparen + tt.deposito + tt.reserv;
  var b3i = box3Indicatie(m, bank0, tt.beleggen, b3.filter(function (x) { return x.comp === "overig" && x.box3; }).reduce(function (s, x) { return s + x.waarde; }, 0), schuldBox3(b3, tt), m.peil);
  if (b3i.belasting > 0) add("belasting", "Box 3: controleer of je teveel betaalt", "Voor je vermogen berekent de app een belasting van circa " + eur(b3i.belasting) + " per jaar. Is je werkelijke rendement lager dan het fictieve rendement, dan kun je dat bij de aangifte aantonen (tegenbewijsregeling). Houd ook rekening met aftrekbare schulden en met het moment van de peildatum (1 januari).", { menu: "fiscaal", actie: "Verzamel jaaroverzichten van spaar- en beleggingsrekeningen en controleer de regels voor dit aangiftejaar.", waar: "belastingdienst.nl" });
  if (lastenCode("contributies").length) add("belasting", "Giften aftrekbaar maken", "Giften aan een goed doel met ANBI-status zijn aftrekbaar. Een periodieke gift (vast bedrag, minimaal 5 jaar, vastgelegd in een overeenkomst) is zonder drempel aftrekbaar.", { menu: "lasten", actie: "Leg vaste giften vast met een schenkingsovereenkomst en geef ze op in de aangifte.", waar: "belastingdienst.nl" });
  var zorgJaar = jaarVan(["eigen_risico", "zorg_kind", "vervoer_kind"]);
  if (zorgJaar >= 500) add("belasting", "Specifieke zorgkosten aftrekken", "Je hebt hoge zorgkosten (circa " + eur(zorgJaar) + " per jaar). Bepaalde zorgkosten zijn aftrekbaar als ze boven een drempel (afhankelijk van je inkomen) uitkomen.", { menu: "lasten", actie: "Bewaar alle nota's en tel zorgkosten, reiskosten voor zorg en hulpmiddelen op voor de aangifte.", waar: "belastingdienst.nl" });
  if (werk.indexOf("zzp") >= 0) add("belasting", "Zelfstandig ondernemer: benut ondernemersaftrek en jaarruimte", "Zzp'ers kunnen onder voorwaarden gebruikmaken van de zelfstandigenaftrek en startersaftrek, en kunnen met de jaarruimte of reserveringsruimte fiscaal vriendelijk pensioen opbouwen via een lijfrente.", { sterkte: "midden", menu: "inkomen", actie: "Controleer je pensioenaanspraken en je jaarruimte en stort tijdig in een lijfrente.", waar: "belastingdienst.nl en je bank of verzekeraar" });

  // ----- Wonen
  if (huur) {
    add("wonen", "Controleer je huurprijs en jaarlijkse huurverhoging", "Voor huurwoningen gelden regels over de maximale huur en de jaarlijkse verhoging. Is de huur te hoog of zijn er onderhoudsgebreken, dan kun je huurverlaging vragen.", { sterkte: "midden", menu: "lasten", actie: "Doe de huurprijscheck en vraag zo nodig toetsing door de Huurcommissie.", waar: "huurcommissie.nl" });
    add("wonen", "Isolatie en energiebesparing in een huurwoning", "Vraag je verhuurder om (betere) isolatie of vervanging van oude apparatuur. Dat kan je energiekosten verlagen.", { menu: "lasten", actie: "Stuur je verhuurder een verzoek en vraag naar gemeentelijke energiecoaches.", waar: "je verhuurder en gemeente" });
  }
  if (koop) {
    add("wonen", "Verduurzamen: subsidie en lening", "Isolatie, een warmtepomp en zonnepanelen verlagen je energiekosten en maken je woning meer waard. Er zijn subsidies en voordelige leningen voor eigenaar-bewoners.", { menu: "lasten", actie: "Bekijk de actuele subsidies en leningen en laat de besparing uitrekenen vóór je investeert.", waar: "rvo.nl (ISDE) en warmtefonds.nl" });
    add("wonen", "Opstalverzekering en hypotheek: controleer of de dekking klopt", "Na verbouwing, uitbouw of een andere herbouwwaarde kan je opstalverzekering te hoog of te laag zijn.", { menu: "lasten", actie: "Controleer de verzekerde som bij de herbouwwaarde en vergelijk premies.", waar: "je verzekeraar" });
  }
  var autoJaar = jaarVan(["auto_belasting", "auto_verz", "auto_brandstof", "auto_onderhoud", "auto_vervanging", "auto_lease", "auto_parkeer"]);
  var nAuto = (L.eigen || 0) + (L.lease || 0);
  if (nAuto >= 1 && autoJaar > 0) add("lasten", nAuto > 1 ? "Heb je alle " + nAuto + " auto's echt nodig?" : "Wat kost je auto echt?", "Je auto" + (nAuto > 1 ? "'s kosten" : " kost") + " samen circa " + eur(autoJaar) + " per jaar" + (nAuto > 1 ? " (gemiddeld " + eur(autoJaar / nAuto) + " per auto)" : "") + ". Een deelauto, taxi of OV voor sommige ritten is soms goedkoper, zeker als de auto veel stilstaat.", { sterkte: "midden", menu: "lasten", actie: "Tel het werkelijke aantal kilometers per jaar en vergelijk met de kosten per kilometer." });

  // ----- Werk en inkomen
  if (heeftLoon) {
    add("inkomen", "Werkgever: onderhandel over arbeidsvoorwaarden", "Naast salaris kun je belastingvriendelijke vergoedingen bespreken: reiskosten, thuiswerkvergoeding, fietsplan, opleiding, extra pensioenopbouw of het omzetten van verlof in geld of tijd.", { menu: "inkomen", actie: "Bereid een gesprek voor met je functioneringsgesprek of loonronde als aanleiding." });
    var deeltijd = m.bronnen.filter(function (b) { return b.soort === "loon" && getal(b.werktijd) > 0 && getal(b.werktijd) < 100; })[0];
    if (deeltijd) add("inkomen", "Meer uren werken: reken het effect door", "Een of meer banen zijn deeltijd (" + getal(deeltijd.werktijd) + "% van een volledige baan). Meer uren geeft meer salaris en pensioen, maar kan toeslagen verlagen. Bekijk het effect op je netto inkomen voordat je beslist.", { menu: "inkomen", actie: "Vul in de app een hoger bruto inkomen in als variant (dupliceer de klant) en vergelijk de netto uitkomst." });
  }
  if (aowFase && fasen.some(function (f) { return f.saldo < -50; })) add("inkomen", "Doorwerken of bijverdienen na je pensioen", "Als je maandinkomen na de AOW-datum lager is dan je uitgaven, kan (deeltijd) doorwerken of bijverdienen het gat dichten. Houd rekening met het effect op toeslagen en belasting.", { menu: "dashboard", actie: "Reken met een variant in de app hoeveel je per maand nodig hebt." });

  // ----- Zekerheid en overzicht
  var fase0 = f0 ? f0.lasten.totaal : 0;
  if (fase0 > 0) {
    var gebufferd = getal(S.grote.minimum);
    if (gebufferd < fase0 * 3) add("zekerheid", "Je buffer is kleiner dan 3 maanden aan lasten", "Je lasten zijn circa " + eur(fase0) + " per maand en je buffer is " + eur(gebufferd) + ". Een veelgebruikte vuistregel is 3 tot 6 maanden aan vaste lasten, zodat je een onverwachte tegenvaller kunt opvangen.", { sterkte: "midden", menu: "vermogen", actie: "Bouw je buffer aan tot minimaal 3 maanden aan lasten (" + eur(fase0 * 3) + ") via een vast maandbedrag." });
    else if (gebufferd > fase0 * 12 && over0(S, m) > 0) add("zekerheid", "Je buffer is groter dan 12 maanden aan lasten", "Je buffer is " + eur(gebufferd) + ", terwijl je lasten circa " + eur(fase0) + " per maand zijn. Een deel daarvan kan mogelijk beter renderen, bijvoorbeeld als deposito of belegging.", { menu: "vermogen", actie: "Beoordeel of je buffer kleiner kan en zet het meerdere vast tegen een hogere rente." });
  }
  if (maxLeeftijd >= 45 || S.profiel.gebruik.pensioen) add("zekerheid", "Controleer je pensioenopbouw", "Het pensioenoverzicht toont wat je bij de AOW-datum ontvangt, en wat je partner krijgt als jij overlijdt. Zo zie je of er een pensioengat is waarvoor je moet bijsparen of anders moet plannen.", { menu: "pensioen", actie: "Log in en bekijk het overzicht; vul de uitkomsten in bij Inkomen en pensioen.", waar: "mijnpensioenoverzicht.nl" });
  if (partner || L.kinderen > 0) add("zekerheid", "Regel wat er bij overlijden of ziekte nodig is", "Met een partner of kinderen is het verstandig om vast te leggen wat er gebeurt bij overlijden of arbeidsongeschiktheid: testament, levenstestament, nabestaandenpensioen, overlijdensrisico- en arbeidsongeschiktheidsverzekering.", { menu: "dashboard", actie: "Laat je testament en de begunstigden van je polissen nalopen, zeker na een verhuizing, trouwen of kind.", waar: "notaris en je financieel adviseur" });
  if (S.profiel.gebruik.pensioen || S.profiel.gebruik.beleggen) {} // geen extra
  var studieSchuld = (S.verm.schulden || []).filter(function (s) { return /studie/i.test(s.naam || ""); }).length || lastenCode("studieschuld").length;
  if (studieSchuld) add("schuld", "Studieschuld: controleer rente en aflosregeling", "Voor een studieschuld bij DUO gelden eigen regels voor rente en aflossing. Controleer of aflossen zin heeft ten opzichte van je spaarrente en wat je maandlast is.", { menu: "vermogen", actie: "Vraag je actuele schuld, rente en aflosregeling op.", waar: "duo.nl" });
}
function over0(S, m) { return Math.max(0, (m.verm.rekeningen || []).reduce(function (a, r) { return a + getal(r.saldo); }, 0) - getal(S.grote.minimum)); }
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
          return h("li", { key: i, className: "kans" }, h("b", null, (p.vinkjes ? "☐ " : "") + k.titel), k.jaar ? h("span", null, " · circa " + eur(k.jaar) + " per jaar") : null, h("br", null), k.tekst,
            k.actie ? h("div", { className: "kans-actie" }, h("b", null, "Wat te doen: "), k.actie, k.waar ? " (" + k.waar + ")" : "") : (k.waar ? h("div", { className: "kans-actie" }, "Waar: " + k.waar) : null));
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

/* ---------- Jaarkalender: vaste momenten en de eigen data van de klant ---------- */
var MAANDNAMEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
function jaarKalender(c) {
  var m = c.m, S = c.S, L = lijstL(S.profiel), vast = [
    [0, "Zorgverzekering: tot en met 31 januari kun je nog overstappen, met terugwerkende kracht per 1 januari."],
    [0, "Kijk of je voorlopige aanslag en je toeslagen kloppen met je verwachte inkomen dit jaar."],
    [2, "Aangifte inkomstenbelasting: je kunt vanaf 1 maart aangifte doen; de uiterste datum is 1 mei (uitstel aanvragen kan)."],
    [8, "Prinsjesdag (derde dinsdag van september): nieuwe belasting- en toeslagcijfers. Druk daarna in de app op 'Cijfers bijwerken'."],
    [10, "Zorgverzekering: de premies voor volgend jaar zijn bekend; vergelijk en stap over."],
    [11, "Peildatum 1 januari: je vermogen op die dag telt voor box 3 en voor toeslagen. Reken vooraf het effect van grote bedragen door."],
    [11, "Giften en extra uitgaven die je wilt aftrekken moeten vóór 31 december zijn gedaan."]
  ];
  if (L.woning === "koop") vast.push([1, "WOZ-beschikking en gemeentelijke aanslagen: controleer de WOZ-waarde; bezwaar kan binnen 6 weken."]);
  var eigen = [];
  function dat(d, tekst) { if (d && d >= m.nu) eigen.push({ d: d, tekst: tekst }); }
  hypRisico(m).forEach(function (r) { if (r.datum) dat(r.datum, r.naam + ": renteherziening. Neem uiterlijk een half jaar eerder contact op met je hypotheekadviseur."); });
  (S.verm.deposito || []).forEach(function (dep) { var pl = depositoPlan(m, dep); if (pl) dat(pl.eind, "Deposito " + (dep.bank || dep.naam || "") + " loopt af. Besluit tijdig waar het geld naartoe gaat."); });
  m.personen.forEach(function (p) { if (p.aow) dat(p.aow, p.naam + ": AOW-datum. Controleer ruim van tevoren je aanvraag bij de SVB."); });
  (S.grote.boekingen || []).forEach(function (b) { var d = geldigeDatum(b.datum); if (d && b.type === "uitgave" && getal(b.bedrag) >= 500) dat(d, (b.omschrijving || "Grote uitgave") + ": " + eur(b.bedrag) + " gepland."); });
  eigen.sort(function (a, b) { return a.d - b.d; });
  return { vast: vast.sort(function (a, b) { return a[0] - b[0]; }), eigen: eigen.slice(0, 12) };
}
function KalenderBlok(p) {
  var k = jaarKalender(p.c);
  return h("div", { "data-kalender": "1" },
    h("h3", null, "Vaste momenten in het jaar"),
    h("ul", { className: "rp-lijst" }, k.vast.map(function (x, i) { return h("li", { key: i }, h("b", null, "☐ " + MAANDNAMEN[x[0]].charAt(0).toUpperCase() + MAANDNAMEN[x[0]].slice(1) + ": "), x[1]); })),
    k.eigen.length ? h("div", null, h("h3", null, "Jouw eigen data"), h("ul", { className: "rp-lijst" }, k.eigen.map(function (x, i) { return h("li", { key: i }, h("b", null, "☐ " + fmtDatum(x.d) + ": "), x.tekst); }))) : null);
}
function KansenSamenvatting(p) {
  var top = p.lijst.filter(function (k) { return k.sterkte === "hoog"; });
  if (!top.length) return null;
  return h("div", { className: "kaart", style: { background: "transparent" } }, h("h3", null, "Begin hiermee"), h("ol", { className: "rp-lijst" }, top.slice(0, 8).map(function (k, i) { return h("li", { key: i }, h("b", null, k.titel), k.jaar ? " (circa " + eur(k.jaar) + " per jaar)" : ""); })));
}
