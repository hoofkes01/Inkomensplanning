/* ===== Cijfers bijwerken, Help, Actualiseren, back-upbalk ===== */
var CIJFERS_URLS = [
  "https://hoofkes01.github.io/Inkomensplanning/blanco/cijfers.json",
  "https://raw.githubusercontent.com/hoofkes01/Inkomensplanning/main/blanco/cijfers.json"
];
function haalCijfers() {
  var i = 0;
  function volgende(laatsteFout) {
    if (i >= CIJFERS_URLS.length) return Promise.reject(laatsteFout || new Error("geen verbinding"));
    var url = CIJFERS_URLS[i++] + "?t=" + Date.now();
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch(url, { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("status " + r.status);
      return r.json();
    }).catch(function (e) { clearTimeout(timer); return volgende(e); });
  }
  return volgende(null);
}
function cijfersGeldig(j) {
  if (!j || typeof j !== "object" || typeof j.versie !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(j.versie)) return "Dit is geen geldig cijferbestand (versie ontbreekt).";
  if (j.fiscaal) {
    var jaren = Object.keys(j.fiscaal);
    for (var k = 0; k < jaren.length; k++) {
      var w = j.fiscaal[jaren[k]] && j.fiscaal[jaren[k]].w;
      if (!w || !(Number(w.schijf1_max) > 0) || !(Number(w.tarief1) > 0) || !(Number(w.aow_bruto_gehuwd_pm) > 0)) return "De fiscale cijfers voor " + jaren[k] + " zijn onvolledig.";
    }
  }
  return "";
}
// Past een cijferbestand toe: fiscale tabel, AOW, box 3, CPI, marktbeeld en fondsrendementen.
function pasCijfersToe(c, j) {
  var f = cijfersGeldig(j);
  if (f) { c.zet("inst", { cijfersFout: { datum: isoDatum(vandaag()), tekst: f } }); return f; }
  var vorige = (c.S.cijfers || {}).versie;
  var m = c.m, delen = [];
  c.zetPad("cijfers", [], j);
  if (j.fiscaal) delen.push("belasting, AOW, kinderbijslag en box 3 (jaren " + Object.keys(j.fiscaal).join(", ") + ")");
  var inst = { cijfersDatum: isoDatum(vandaag()), cijfersFout: null };
  if (j.indexatie) {
    if (j.indexatie.schijven != null && isFinite(Number(j.indexatie.schijven))) inst.indexSchijven = Number(j.indexatie.schijven);
    if (j.indexatie.aow != null && isFinite(Number(j.indexatie.aow))) inst.indexAOW = Number(j.indexatie.aow);
    delen.push("indexatiepercentages");
  }
  if (j.cpi && j.cpi.maand && Number(j.cpi.pct) >= 0) {
    var ijk = c.S.inst.cpiIjk || isoDatum(m.peil).slice(0, 7);
    if (j.cpi.maand > ijk) { cpiBijwerken(c, j.cpi.maand, Number(j.cpi.pct)); delen.push("inflatie " + pct(j.cpi.pct, 1) + " (" + j.cpi.maand + ")"); }
    else { inst.cpi = Number(j.cpi.pct); inst.cpiStand = isoDatum(vandaag()); delen.push("inflatie " + pct(j.cpi.pct, 1)); }
  }
  c.zet("inst", inst);
  if (j.markt) delen.push("marktbeeld");
  var ontbreekt = [];
  if (!j.fiscaal) ontbreekt.push("belasting en AOW");
  if (!j.cpi) ontbreekt.push("inflatie");
  var tekst = "Bijgewerkt met cijfers van " + fmtDatum(j.versie) + ": " + (delen.join(", ") || "geen nieuwe onderdelen") + ".";
  if (vorige && j.versie <= vorige) tekst += " Let op: dit is niet nieuwer dan de cijfers die je al had (" + fmtDatum(vorige) + "); er zijn nog geen nieuwere cijfers.";
  if (dagenTussen(geldigeDatum(j.versie), c.m.nu) > 45) tekst += " Let op: het cijferbestand is ouder dan 45 dagen, dus mogelijk zijn de nieuwste bedragen er nog niet in.";
  if (ontbreekt.length) tekst += " Let op: in het bestand ontbreken: " + ontbreekt.join(" en ") + ".";
  return tekst;
}
function CijfersKnop() {
  var c = useC();
  var s = useState(""), melding = s[0], setMelding = s[1];
  var b = useState(false), bezig = b[0], setBezig = b[1];
  var stand = c.S.inst.cijfersDatum;
  var oud = ouderDan(stand, 14, c.m.nu);
  function klik() {
    setBezig(true); setMelding("");
    haalCijfers().then(function (j) { setMelding(pasCijfersToe(c, j)); }).catch(function (e) {
      var t = "de cijfers konden niet worden opgehaald (" + (e && e.message || "geen verbinding") + ").";
      c.zet("inst", { cijfersFout: { datum: isoDatum(vandaag()), tekst: t } });
      setMelding("Bijwerken is mislukt: " + t + " Controleer je internetverbinding en probeer het later opnieuw, of kies een cijferbestand.");
    }).then(function () { setBezig(false); });
  }
  return h("div", { "data-cijfers": "1" },
    h("p", { className: oud ? "oranje" : "" }, "Cijfers laatst bijgewerkt: " + (stand ? fmtDatum(stand) : "nog nooit") + (oud ? ". Druk op de knop om belasting, AOW en inflatie te vernieuwen." : ".")),
    h("div", { className: "rij" },
      h(Knop, { onClick: klik, disabled: bezig, naam: "cijfers-bijwerken" }, bezig ? "Bezig…" : "Cijfers bijwerken"),
      h("label", { className: "knop sec klein2", style: { display: "inline-block", cursor: "pointer" } }, "Cijferbestand kiezen",
        h("input", { type: "file", accept: "application/json,.json", style: { display: "none" }, "data-veld": "cijfers-bestand", onChange: function (e) {
          var f = e.target.files[0]; if (!f) return;
          var r = new FileReader(); r.onload = function () { try { setMelding(pasCijfersToe(c, JSON.parse(String(r.result)))); } catch (x) { setMelding("Het bestand kon niet worden gelezen."); } }; r.readAsText(f); e.target.value = "";
        } }))),
    (c.S.inst.cijfersFout && !melding) ? h("div", { className: "kaart fout", role: "alert", "data-cijfers-fout": "1" }, h("b", null, "Bijwerken is mislukt"), h("p", null, "Op " + fmtDatum(c.S.inst.cijfersFout.datum) + ": " + c.S.inst.cijfersFout.tekst + " Je rekent met oudere cijfers.")) : null,
    melding ? h("p", { className: (/mislukt|niet geldig|onvolledig/.test(melding) ? "rood" : "klein"), role: "status", "data-cijfers-melding": "1" }, melding) : null,
    h("p", { className: "klein" }, "Druk hier elke maand op. De app haalt dan de nieuwste cijfers van de Belastingdienst, SVB en het CBS op. Je hoeft zelf niets in te vullen."));
}

/* ---------- Help ---------- */
var HELP_ITEMS = [
  ["Wat doet deze app?", "doel inkomen planning overzicht", "De app laat zien hoeveel geld je maandelijks overhoudt, hoe je spaargeld zich ontwikkelt en of je genoeg hebt, nu en na je pensioen. Alles is een rekenvoorbeeld op basis van wat je invult."],
  ["Anoniem blijven", "privacy bsn adres telefoon naam iban rekeningnummer persoonsgegevens", "Vul nooit je naam, BSN, adres, postcode, telefoonnummer, e-mailadres of rekeningnummer in. Personen heten 'Man', 'Vrouw', 'Man 1' enzovoort. De app weigert tekst die op zulke gegevens lijkt. Alles blijft op je eigen apparaat."],
  ["De intake", "intake vragen starten verder overslaan", "Eerst volgt een algemene intake over je huishouden, woning, auto en gezin. Daarna heeft elk menu een eigen korte intake. Je antwoorden worden direct bewaard; je kunt altijd stoppen en later verder. Overslaan kan, de app zegt dan wat er niet berekend wordt. Opnieuw starten kan via 'Intake opnieuw'."],
  ["Een tweede persoon of alleen jezelf", "partner twee personen alleen man vrouw", "Je kunt de planning voor een man, een vrouw, of voor twee personen maken (man en vrouw, twee mannen of twee vrouwen). Elke volwassene kan een eigen planning maken. Kies bij de algemene intake het juiste huishouden."],
  ["Peildatum", "datum vandaag peil", "De datum waarop je bedragen gelden. Leeg laten betekent: vandaag. Handig om een eerdere stand na te rekenen."],
  ["Bruto en netto", "bruto netto salaris loon heffingskorting", "Bruto is voor belasting, netto is wat je ontvangt. Vul bij voorkeur beide in. Vul je alleen het bruto in, dan schat de app het netto met de fiscale tabel."],
  ["Heffingskorting", "heffingskorting netto korting ouderenkorting arbeidskorting", "Je hoeft niets in te vullen. De app past de heffingskorting automatisch toe op je hoogste inkomen, op basis van je leeftijd (voor of na de AOW-leeftijd), of je werkt (arbeidskorting) en de hoogte van je inkomen. Vul bij elk inkomen het netto in zoals op je specificatie staat."],
  ["Toeslagen en kinderbijslag", "huurtoeslag zorgtoeslag kinderopvangtoeslag kindgebonden budget kinderbijslag toeslag", "Toeslagen en kinderbijslag zijn belastingvrij en tellen volledig mee als inkomen. De kinderbijslag rekent de app zelf uit met de geboortedatum van elk kind (SVB-bedragen per kwartaal, stopt in het kwartaal waarin je kind 18 wordt). Huurtoeslag, zorgtoeslag, kindgebonden budget en kinderopvangtoeslag vul je zelf in: bedrag per betaling en hoe vaak. Pas het bedrag aan zodra de Belastingdienst een nieuw bedrag doorgeeft. Bij kinderopvangtoeslag en kindgebonden budget zet de app een einddatum klaar op basis van de leeftijd van je kinderen; controleer die."],
  ["Kind met een beperking", "gehandicapt beperking intensieve zorg dubbele kinderbijslag extra kinderbijslag wlz ciz pgb", "Vink bij het kind aan dat het een beperking met intensieve zorg heeft (bijvoorbeeld Wlz-indicatie of positief CIZ-advies, minstens 4 nachten per week thuis). De app rekent dan dubbele kinderbijslag voor 3 tot en met 17 jaar en biedt extra posten aan: extra kinderbijslag (vast bedrag per jaar), een tegemoetkoming of vergoeding, en extra zorg- en vervoerskosten. Voer die bedragen zelf in; de SVB, het CIZ en je gemeente geven ze door. Een persoonsgebonden budget (pgb) is geld voor zorg en telt niet mee als inkomen."],
  ["Auto's", "auto eigen lease deelauto taxi", "Je kunt meer dan één auto hebben: kies het aantal eigen auto's en leaseauto's (ook 0), en of je een deelauto of taxi gebruikt. Per auto komen de passende lasten: verzekering, belasting, onderhoud bij een eigen auto, de leasetermijn bij een leaseauto."],
  ["Huur, koop of geen woning", "woning huur koop hypotheek inwonend", "De vragen en lasten passen zich aan. Huurder: huur, servicekosten en eventueel huurtoeslag. Eigenaar: hypotheek, OZB, opstalverzekering, onderhoud en WOZ-waarde. Geen woning: een eventuele bijdrage voor woonkosten."],
  ["Hypotheek", "hypotheek rente aflossing rentevast renteherziening box 1 box 3 hypotheekrenteaftrek eigenwoningforfait", "Voeg elk hypotheekdeel apart toe (zoveel als je hebt) en kies de box: box 1 is besteed aan de eigen woning (rente aftrekbaar), box 3 is niet aan de eigen woning besteed (geen aftrek, telt als schuld in box 3). Kies per deel de aflossingsvorm: annuïteit (vaste maandlast), lineair (vaste aflossing, dalende maandlast), aflossingsvrij of spaar-/beleggingshypotheek. Vul het bedrag, de rente, de maandlast en de renteherzieningsdatum in: daarna wordt de rente opnieuw vastgesteld en dat is een risico. De app rekent het belastingvoordeel van de renteaftrek zelf uit en toont wat 1 procentpunt hogere rente kost."],
  ["Spaargeld en rente", "sparen spaarrekening rente saldo bank", "Vul per rekening alleen de bank, het soort rekening en het saldo in. De rente wordt per dag berekend en op 31 december bijgeschreven."],
  ["Deposito's", "deposito bank looptijd rente vrijval verlengen", "Vul bank, bedrag, rente, start en looptijd of einddatum in. Bij vrijval gaat het geld naar je spaarrekening. De app verlengt nooit zelf: een nieuw deposito voeg je zelf toe met een nieuwe startdatum."],
  ["Beleggen en beleggingsadvies", "beleggen advies etf isin portefeuille degiro", "Alleen zichtbaar als je belegt of wilt beginnen. De app toont ISIN's en bedragen, geen koersen. Upload je portefeuille (csv of tekst) voor een voorstel in vier stappen. Het is een rekenvoorbeeld, geen persoonlijk advies."],
  ["Reserveringen", "reserveren sparen doel potje", "Een maandbedrag dat automatisch op een vaste dag van je spaarrekening naar een pot gaat, bijvoorbeeld voor vakantie. Opnames geef je zelf aan bij 'Geplande boekingen'."],
  ["Heb ik genoeg geld?", "minimum buffer laagste punt tekort", "Bij 'Grote posten en reserveringen' zie je per maand het laagste punt van je spaargeld ten opzichte van je minimum. Rood of oranje betekent dat je onder je buffer of onder nul komt."],
  ["Lijfrente en pensioenpot", "lijfrente pensioen pot annuiteit uitkering", "Vul het saldo, het verwachte rendement en de looptijd van de uitkering in. De app berekent de maandelijkse uitkering en het netto bedrag. Bij pensioen van een fonds met een vast bedrag vul je liever een inkomen in bij 'Inkomen'."],
  ["AOW en AOW-datum", "aow leeftijd datum pensioen svb", "De app berekent je AOW-datum uit je geboortedatum. De AOW-leeftijd voor jongere jaren is verwacht, niet definitief. Wijkt jouw datum af, pas hem aan. AOW telt mee vanaf de maand van de AOW-datum."],
  ["Inkomensaanvulling", "aanvulling overbrugging pot opname", "Een pot waaruit je maandelijks opneemt tot je AOW begint. Alleen zichtbaar als je dit aanzet."],
  ["Box 3", "box 3 vermogensbelasting heffingsvrij forfaitair", "Belasting over spaargeld en beleggingen. De app toont een indicatie met het fictief rendement van de Belastingdienst. Controleer je aangifte altijd zelf."],
  ["Inflatie (CPI) en fiscale cijfers", "cpi inflatie index belasting tabel cijfers bijwerken", "Hier hoef je niets aan te passen. Druk elke maand op 'Cijfers bijwerken' (Dashboard of Fiscaliteit): de app haalt dan de nieuwste cijfers op en past vaste lasten aan op de gemeten inflatie."],
  ["Toeslagen: heb ik er recht op?", "toeslag zorgtoeslag huurtoeslag kindgebonden budget kinderopvangtoeslag recht grens vermogen inkomen", "De app kijkt naar je woning, inkomen, vermogen en gezin en vraagt actief naar toeslagen waar je mogelijk recht op hebt: zorgtoeslag, huurtoeslag, kindgebonden budget en kinderopvangtoeslag. Je antwoordt ja, nee of weet ik niet. Bij ja vul je het bedrag van je beschikking in. De app berekent het bedrag niet zelf; toeslagen.nl heeft een proefberekening. Bij 'Weet ik niet' blijft er een herinnering op het Dashboard staan."],
  ["Bedragen indexeren", "indexeren indexering verhoging toeslagen percentage aanpassen", "Is een bedrag verhoogd, bijvoorbeeld een toeslag of een cao-verhoging? Kies op het Dashboard 'Bedragen indexeren', geef de groep en het percentage op en bevestig. De app past alle bedragen in die groep aan. Kinderbijslag, belasting en AOW worden bijgewerkt met 'Cijfers bijwerken'."],
  ["Actualiseren", "bijwerken saldo actueel maand", "Werk minstens elke maand je saldi bij: spaargeld, deposito's, beleggingen en pensioen. Gebruik 'Nu actualiseren' op het Dashboard; het leidt je stap voor stap langs alles en onthoudt wanneer je bijwerkte."],
  ["Gegevens opslaan en verder gaan", "back-up opslaan terugzetten bestand versie", "Je gegevens staan alleen in deze browser. Tik onderaan op de balk 'Back-up' om je gegevens als bestand op te slaan. Bij een nieuwe versie van de app, of een andere telefoon: open de app en kies 'Gegevens terugzetten'."],
  ["Rapport en PDF", "rapport pdf afdrukken", "Kies Rapport (PDF) en tik op 'Afdrukken of opslaan als PDF'. Kies in het afdrukvenster 'Opslaan als PDF'. In de intake van het rapport kies je welke onderdelen erin komen."],
  ["Het fasenoverzicht lezen", "fase dashboard netto inkomen saldo", "Per moment (nu, stoppen met werken, AOW) zie je het netto inkomen per maand, de lasten en wat er overblijft. Bedragen zijn in de prijzen van dat moment, inclusief verwachte indexatie."]
];
function HelpModal(p) {
  var s = useState(""), q = s[0], setQ = s[1];
  var s2 = useState(null), open = s2[0], setOpen = s2[1];
  var woorden = q.toLowerCase().split(/\s+/).filter(function (x) { return x; });
  var lijst = HELP_ITEMS.filter(function (it) {
    var t = (it[0] + " " + it[1] + " " + it[2]).toLowerCase();
    return woorden.every(function (w) { return t.indexOf(w) >= 0; });
  });
  return h(Modal, { titel: "Help", sluit: p.sluit },
    h("input", { type: "search", value: q, placeholder: "Zoek, bijvoorbeeld: toeslag, deposito, back-up", "data-veld": "help-zoek", onChange: function (e) { setQ(e.target.value); }, autoFocus: true }),
    h("p", { className: "klein" }, lijst.length + " onderwerp(en)"),
    lijst.map(function (it) {
      var o = open === it[0] || woorden.length > 0 && lijst.length <= 3;
      return h("div", { key: it[0], className: "kaart", style: { background: "#f8fafc", marginTop: ".4rem" }, "data-help": it[0] },
        h("button", { type: "button", className: "linkknop", style: { fontWeight: 700, whiteSpace: "normal", textAlign: "left" }, onClick: function () { setOpen(open === it[0] ? null : it[0]); } }, (o ? "▾ " : "▸ ") + it[0]),
        o ? h("p", null, it[2]) : null);
    }),
    lijst.length === 0 ? h("p", null, "Niets gevonden. Probeer een ander woord, of start de intake opnieuw via het menu.") : null);
}

/* ---------- Bedragen indexeren en toeslagen bijwerken ---------- */
var INDEX_GROEPEN = [["toeslagen", "Toeslagen en vergoedingen"], ["inkomen", "Inkomen (loon, uitkering, pensioen)"], ["lasten", "Vaste lasten"], ["dagelijks", "Dagelijkse uitgaven"], ["alles", "Alles hierboven"]];
function r2(x) { return Math.round(x * 100) / 100; }
function indexeerBedragen(c, groep, pctw) {
  var f = 1 + getal(pctw) / 100, nu = isoDatum(vandaag());
  function mul(v) { return v === "" || v == null ? v : r2(getal(v) * f); }
  var doeT = groep === "toeslagen" || groep === "alles", doeI = groep === "inkomen" || groep === "alles", doeL = groep === "lasten" || groep === "alles", doeD = groep === "dagelijks" || groep === "alles";
  if (doeT || doeI) {
    c.zetPad("bronnen", [], c.S.bronnen.map(function (b) {
      var toeslag = b.soort === "toeslag";
      if ((toeslag && !doeT) || (!toeslag && !doeI)) return b;
      return Object.assign({}, b, { bruto: mul(b.bruto), netto: mul(b.netto), wijzigBruto: mul(b.wijzigBruto), wijzigNetto: mul(b.wijzigNetto), bijgewerkt: nu });
    }));
  }
  if (doeL) c.zetPad("lasten", [], c.S.lasten.map(function (x) { return Object.assign({}, x, { bedrag: mul(x.bedrag) }); }));
  if (doeD && c.S.dagelijks.bedrag !== "") c.zet("dagelijks", { bedrag: mul(c.S.dagelijks.bedrag) });
}
function IndexeerKaart() {
  var c = useC();
  var s1 = useState("toeslagen"), groep = s1[0], setGroep = s1[1];
  var s2 = useState(""), p = s2[0], setP = s2[1];
  var s3 = useState(false), zeker = s3[0], setZeker = s3[1];
  var s4 = useState(""), melding = s4[0], setMelding = s4[1];
  return h("div", { "data-indexeer": "1" },
    h(Uitleg, null, "Is een bedrag verhoogd (bijvoorbeeld de jaarlijkse verhoging van toeslagen of een cao-verhoging)? Vul het percentage in; de app past alle bedragen in de gekozen groep aan."),
    h("div", { className: "raster" },
      h(KeuzeVeld, { label: "Welke bedragen", value: groep, opties: INDEX_GROEPEN, onChange: function (v) { setGroep(v); setZeker(false); }, naam: "indexeer-groep" }),
      h(BedragVeld, { label: "Verhoging (%)", hint: "Een daling kan met een min-teken.", value: p, pct: true, neg: true, onChange: function (v) { setP(v); setZeker(false); setMelding(""); }, naam: "indexeer-pct" })),
    p !== "" && !zeker ? h(Knop, { soort: "sec", onClick: function () { setZeker(true); }, naam: "indexeer-toepassen" }, "Bedragen aanpassen") : null,
    zeker ? h("div", { className: "kaart waarschuw" }, h("p", null, "Alle bedragen in deze groep worden met " + pct(p, 1) + " aangepast. Dit kun je terugdraaien door hetzelfde percentage met een min-teken toe te passen."), h("div", { className: "rij" }, h(Knop, { onClick: function () { indexeerBedragen(c, groep, p); setZeker(false); setMelding("Aangepast met " + pct(p, 1) + " (" + INDEX_GROEPEN.filter(function (x) { return x[0] === groep; })[0][1].toLowerCase() + ")."); setP(""); }, naam: "indexeer-bevestig" }, "Ja, aanpassen"), h(Knop, { soort: "sec", onClick: function () { setZeker(false); } }, "Annuleren"))) : null,
    melding ? h("p", { className: "groen", role: "status" }, melding) : null);
}
function ToeslagenActualiseer() {
  var c = useC(), m = c.m, L = c.lijst("bronnen"), L2 = lijstL(m.profiel), tw = toeslagWaarschuwingen(c);
  var toeslagen = L.items.filter(function (b) { return b.soort === "toeslag"; });
  return h("div", null,
    tw.map(function (t, i) { return h("div", { key: i, className: "kaart waarschuw", "data-toeslag-controle": "1" }, t); }),
    h(ToeslagenVraag, null),
    h("div", { className: "kaart", style: { background: "#f8fafc" } }, h("p", { className: "klein" }, "De SVB past de kinderbijslag in januari en juli aan. Druk op 'Cijfers bijwerken' voor de nieuwste bedragen."), h(CijfersKnop, null)),
    toeslagen.length ? h("div", { className: "kaart", style: { background: "#f8fafc" } }, h("b", null, "Toeslagen en vergoedingen"),
      h(Uitleg, null, "Controleer je bedragen op je laatste beschikking van de Belastingdienst, DUO of je gemeente en pas aan wat veranderd is."),
      toeslagen.map(function (b) {
        return h("div", { key: b.id, "data-toeslag": b.code },
          h(BedragVeld, { label: (b.naam || "Toeslag") + " (per betaling, " + (FREQ_KEUZES.filter(function (f) { return f[0] === (b.freq || "maand"); })[0] || ["", "per maand"])[1].toLowerCase() + ")", value: b.netto, onChange: function (v) { L.wijzig(b.id, { netto: v, bijgewerkt: isoDatum(vandaag()) }); }, naam: "toeslag-" + b.code }),
          h("p", { className: "klein" }, b.bijgewerkt ? "Laatst aangepast op " + fmtDatum(b.bijgewerkt) + "." : "Nog niet aangepast sinds het invullen."));
      })) : (L2.kbAuto ? null : h("p", { className: "klein" }, "Je hebt geen toeslagen of kinderbijslag ingevuld.")),
    h("div", { className: "kaart", style: { background: "#f8fafc" } }, h("b", null, "Bedragen indexeren"), h(IndexeerKaart, null)));
}

/* ---------- Actualiseren ---------- */
function actualiseerStappen(c) {
  var g = c.S.profiel.gebruik, koop = c.S.profiel.leef.woning === "koop", m = c.m;
  return [
    { id: "spaar", titel: "Spaargeld en rente", render: function () { return h(SpaarVeld, null); } },
    g.deposito ? { id: "deposito", titel: "Deposito's", render: function () { return h(DepositoEditor, null); } } : null,
    g.beleggen ? { id: "beleggen", titel: "Beleggingen", render: function () { return h("div", null, h(BeleggingenEditor, null), h(Uitleg, null, "Upload je portefeuille bij Beleggingsadvies voor een actueel advies.")); } } : null,
    g.pensioen ? { id: "pensioen", titel: "Lijfrente en pensioenpotten", render: function () { return h(PottenEditor, null); } } : null,
    g.aanvulling ? { id: "aanvulling", titel: "Inkomensaanvulling", render: function () { return h(AanvulVelden, null); } } : null,
    koop ? { id: "hypotheek", titel: "Hypotheek", render: function () { return h(HypotheekForm, null); } } : null,
    { id: "inkomen", titel: "Inkomen en toeslagen", render: function () { return h("div", null, m.personen.map(function (p) { return h("div", { key: p.id }, h("h4", null, p.naam), h(BronnenEditor, { persoon: p.id })); })); } },
    (lijstL(c.S.profiel).kbAuto || c.S.bronnen.some(function (b) { return b.soort === "toeslag"; }) || toeslagKandidaten(c).kandidaten.length) ? { id: "toeslagen", titel: "Kinderbijslag en toeslagen", dagen: 92, render: function () { return h(ToeslagenActualiseer, null); } } : null,
    { id: "lasten", titel: "Vaste lasten en dagelijkse uitgaven", render: function () { return h("div", null, h(DagelijksVeld, null), h(LastenEditor, null)); } },
    { id: "cijfers", titel: "Cijfers bijwerken", render: function () { return h(CijfersKnop, null); } }
  ].filter(function (x) { return x; });
}
function actualiseerLeeftijd(c, id) {
  var d = (c.S.actual.datum || {})[id];
  return d ? dagenTussen(geldigeDatum(d), c.m.nu) : null;
}
function ActualiseerModal(p) {
  var c = useC(), stappen = actualiseerStappen(c);
  var s = useState(0), i = s[0], setI = s[1];
  var st = stappen[i];
  function klaar() { c.zetPad("actual", ["datum", st.id], isoDatum(vandaag())); volgende(); }
  function volgende() { if (i + 1 >= stappen.length) { p.sluit(); } else setI(i + 1); }
  var leeftijd = actualiseerLeeftijd(c, st.id);
  return h(Modal, { titel: "Actualiseren", sluit: p.sluit },
    h("p", { className: "klein" }, "Stap " + (i + 1) + " van " + stappen.length + ". Controleer de bedragen, pas aan wat veranderd is en tik op 'Bijgewerkt'."),
    h("div", { className: "stappen" }, stappen.map(function (x, j) { return h("i", { key: x.id, className: j <= i ? "klaar" : "" }); })),
    h("h3", null, st.titel),
    h("p", { className: "klein" }, leeftijd == null ? "Nog nooit bijgewerkt." : "Laatst bijgewerkt: " + (leeftijd === 0 ? "vandaag" : leeftijd + " dagen geleden") + "."),
    h("div", { "data-actualiseer": st.id }, st.render()),
    h("div", { className: "rij tussen", style: { marginTop: ".6rem" } },
      h(Knop, { soort: "sec", disabled: i === 0, onClick: function () { setI(i - 1); } }, "Terug"),
      h("div", { className: "rij" }, h(Knop, { soort: "sec", onClick: volgende, naam: "actualiseer-overslaan" }, "Overslaan"), h(Knop, { onClick: klaar, naam: "actualiseer-klaar" }, "Bijgewerkt"))));
}
function ActualiseerKaart() {
  var c = useC(), stappen = actualiseerStappen(c);
  var s = useState(false), open = s[0], setOpen = s[1];
  return h(Kaart, { titel: "Actualiseren", id: "actualiseren" },
    h("p", { className: "klein" }, "Werk minstens elke maand je saldi bij, zodat de planning actueel blijft."),
    h(Tabel, { kop: ["Onderdeel", "Laatst bijgewerkt"], get: [1], rijen: stappen.map(function (x) {
      var l = actualiseerLeeftijd(c, x.id);
      if (x.id === "cijfers" && c.S.inst.cijfersFout) return [x.titel, h("span", { className: "rood" }, "mislukt")];
      return [x.titel, l == null ? h("span", { className: "oranje" }, "nog niet") : h("span", { className: l > (x.dagen || 31) ? "oranje" : "groen" }, l === 0 ? "vandaag" : l + " dagen geleden")];
    }) }),
    h("div", { className: "rij", style: { marginTop: ".5rem" } }, h(Knop, { onClick: function () { setOpen(true); }, naam: "actualiseren" }, "Nu actualiseren")),
    open ? h(ActualiseerModal, { sluit: function () { setOpen(false); } }) : null);
}

/* ---------- Back-upbalk linksonder (zoals in je eigen app) ---------- */
var BACKUP_META = "ip_backupMeta";
var BACKUP_NEGEER = /^inkomensplanning_(_kapot_.*|cijfers)$/;
function opslagStand(volledig) {
  var o = {};
  try {
    for (var i = 0; i < window.localStorage.length; i++) {
      var k = window.localStorage.key(i);
      if (k && k.indexOf(OPSLAG_VOORVOEGSEL) === 0 && (volledig ? k.indexOf(OPSLAG_VOORVOEGSEL + "_kapot_") !== 0 : !BACKUP_NEGEER.test(k))) o[k] = window.localStorage.getItem(k);
    }
  } catch (e) {}
  return o;
}
function opslagHash(o) {
  var t = JSON.stringify(Object.keys(o).sort().map(function (k) { return [k, o[k]]; })), h2 = 5381;
  for (var i = 0; i < t.length; i++) h2 = ((h2 << 5) + h2 + t.charCodeAt(i)) | 0;
  return t.length + ":" + h2;
}
function backupMeta() { try { return JSON.parse(window.localStorage.getItem(BACKUP_META) || "null"); } catch (e) { return null; } }
function tijdTekst(ms) {
  var d = new Date(ms), v = new Date(), p2 = function (n) { return String(n).padStart(2, "0"); };
  var uur = p2(d.getHours()) + ":" + p2(d.getMinutes());
  var dagen = Math.floor((new Date(v.getFullYear(), v.getMonth(), v.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return dagen === 0 ? "vandaag " + uur : dagen === 1 ? "gisteren " + uur : p2(d.getDate()) + "-" + p2(d.getMonth() + 1) + " " + uur;
}
function bewaarBackup() {
  try { downloadBackup(); } catch (e) { meldOpslagprobleem("backup", "Back-up opslaan is mislukt (" + ((e && e.message) || "onbekende fout") + "). Probeer het opnieuw."); return false; }
  try { delete OPSLAG_MELDINGEN.backup; window.localStorage.setItem(BACKUP_META, JSON.stringify({ hash: opslagHash(opslagStand(false)), tijd: Date.now() })); } catch (e) { meldOpslagprobleem("backup", "De back-up is gemaakt, maar de browser kon de status niet onthouden."); }
  return true;
}
function BackupBalk() {
  var s = useState(0), setTik = s[1];
  useEffect(function () {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    var t = setInterval(function () { setTik(function (x) { return x + 1; }); }, 3000);
    return function () { clearInterval(t); };
  }, []);
  var meta = backupMeta(), nu = opslagHash(opslagStand(false));
  var leeg2 = !Object.keys(opslagStand(false)).length;
  var kleur, tekst;
  if (!meta) { kleur = "#dc2626"; tekst = "Back-up: nog niet gemaakt. Tik om op te slaan."; }
  else if (meta.hash !== nu) { kleur = "#d97706"; tekst = "Wijzigingen nog niet bewaard (laatste back-up " + tijdTekst(meta.tijd) + "). Tik om op te slaan."; }
  else { kleur = "#16a34a"; tekst = "Back-up actueel (" + tijdTekst(meta.tijd) + ")"; }
  return h("button", { type: "button", className: "balkje noprint", "data-balkje": "1", style: { borderColor: kleur, color: kleur === "#16a34a" ? "#166534" : "#7c2d12" },
    onClick: function () { bewaarBackup(); setTik(function (x) { return x + 1; }); } }, tekst);
}
