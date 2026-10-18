/* ===== Intake: eerst een algemene intake (Dashboard), daarna een korte intake per menu waar dat nodig is ===== */
function foutenLijst(items, f) { var uit = []; items.forEach(function (x) { uit = uit.concat(f(x)); }); return uit; }
function intakeKeuze(w, tekst) { return !w ? [tekst] : []; }

INTAKE.dashboard = {
  titel: "Algemene intake", stappen: [
    { id: "anoniem", titel: "Anoniem werken", uitleg: "Deze app vraagt nooit om persoonsgegevens.", render: function () { return h(AnoniemInfo, null); },
      valideer: function (c) { return c.S.profiel.akkoordAnoniem ? [] : ["Bevestig dat je geen persoonsgegevens invult."]; } },
    { id: "huishouden", titel: "Voor wie is deze planning?", uitleg: "Kies de samenstelling van je huishouden. Elke volwassene kan een eigen planning maken.", render: function () { return h(HuishoudenKeuze, null); },
      valideer: function (c) { return c.S.profiel.type ? [] : ["Kies de samenstelling van je huishouden."]; } },
    { id: "geboorte", titel: "Geboortedatum", uitleg: "De geboortedatum is nodig om de AOW-datum te berekenen. Alleen de datum, geen naam.", render: function () { return h(GeboorteVelden, null); },
      valideer: function (c) { return foutenAlgemeen(c); } },
    { id: "aow", titel: "AOW-datum", uitleg: "De app berekent de AOW-datum uit de geboortedatum (verwachte AOW-leeftijd). Pas hem aan als jouw datum afwijkt; kijk op svb.nl.", render: function () { return h(AowKaart, null); } },
    { id: "werk", titel: "Werk en inkomen", uitleg: "Waar komt je inkomen vandaan? Daarop past de app de vragen aan.", render: function () { return h(WerkStatusVelden, null); },
      overslaan: "de app toont dan alle soorten inkomen; je moet zelf kiezen wat past." },
    { id: "woning", titel: "Wonen", uitleg: "Huur of koop leidt tot andere lasten en toeslagen.", render: function () { return h(WoningVelden, null); },
      valideer: function (c) { return intakeKeuze(c.S.profiel.leef.woning, "Kies je woonsituatie."); } },
    { id: "auto", titel: "Auto's", uitleg: "Eigen auto's, leaseauto's, een deelauto of geen auto geven andere lasten. Er mogen er meer dan één zijn.", render: function () { return h(AutoVelden, null); },
      valideer: function (c) { var l = c.S.profiel.leef; return leeg([(l.eigen === "" || l.eigen === undefined) ? "Kies het aantal eigen auto's (Geen mag ook)." : null, (l.lease === "" || l.lease === undefined) ? "Kies het aantal leaseauto's (Geen mag ook)." : null]); } },
    { id: "gezin", titel: "Gezin", uitleg: "Kinderen geven recht op kinderbijslag en toeslagen en brengen kosten mee. De geboortedatum van elk kind bepaalt de kinderbijslag (die stopt in het kwartaal waarin je kind 18 wordt) en hoelang kinderopvang loopt.", render: function () { return h(GezinVelden, null); },
      valideer: function (c) { return foutenKinderen(c); } },
    { id: "buffer", titel: "Minimale buffer", uitleg: "Hoeveel spaargeld wil je altijd direct beschikbaar hebben? Dit verschilt per persoon. De app waarschuwt als je er onder komt en belegt of reserveert nooit geld dat nodig is voor de buffer.", render: function () { return h(MinimumVeld, null); },
      valideer: function (c) { var v = c.S.grote.minimum; return v === "" || v == null ? ["Vul je minimale buffer in (0 mag ook)."] : leeg([nietNeg(v, "Buffer")]); } },
    { id: "producten", titel: "Onderdelen en peildatum", uitleg: "Spaargeld heeft iedereen. Deposito's en beleggen alleen als dat bij je past; je kunt er later altijd mee beginnen.", render: function () { return h("div", null, h(ProductenVelden, null), h(PeildatumVeld, null)); },
      valideer: function (c) { return leeg([datumFout(c.S.profiel.peildatum, "Peildatum")]); } }
  ]
};
INTAKE.inkomen = {
  titel: "Inkomen", stappen: function (c) {
    var st = c.m.personen.map(function (p) {
      var w = (c.S.profiel.werk || {})[p.id] || [];
      return { id: "inkomen" + p.id, titel: "Inkomen van " + p.naam, uitleg: "Kies elke soort inkomen die " + p.naam + " heeft en vul de bedragen in" + (w.length ? " (" + w.map(function (x) { return (WERKSTATUS.filter(function (y) { return y[0] === x; })[0] || ["", ""])[1].toLowerCase(); }).join(", ") + ")" : "") + ". De AOW rekent de app zelf uit. Toeslagen zoals huurtoeslag staan onder de eerste persoon.",
        render: function () { return h(BronnenEditor, { persoon: p.id }); },
        valideer: function (cc) { return foutenLijst(cc.S.bronnen.filter(function (b) { return b.persoon === p.id; }), foutenBron); },
        overslaan: "het inkomen van " + p.naam + " telt dan niet mee; de uitkomsten kloppen niet." };
    });
    if (c.m.bronnen.some(function (b) { return b.soort === "loon"; })) st.push({ id: "werken", titel: "Werken of stoppen", uitleg: "Per jaar tot de pensioendatum: werk je dat jaar nog? Loon telt in jaren zonder vinkje niet mee.", render: function () { return h(WerkJarenTabel, null); }, overslaan: "de app gaat ervan uit dat je werkt tot de AOW-datum of de einddatum van je loon." });
    return st;
  }
};
INTAKE.aanvulling = {
  titel: "Toevoeging inkomen", stappen: [
    { id: "aanvulling", titel: "Hoeveel aanvulling per maand?", uitleg: "Geef aan hoeveel je per maand extra nodig hebt en tot wanneer. De app toetst of dat kan met je spaargeld of beleggingen, en rekent uit hoeveel je daarvoor apart moet zetten.", render: function () { return h(AanvulVelden, null); },
      valideer: function (c) { return foutenAanv(c); }, overslaan: "er wordt dan geen aanvulling meegerekend." }
  ]
};
INTAKE.pensioen = {
  titel: "Lijfrente en pensioen", stappen: function (c) {
    var st = [];
    if (c.S.profiel.gebruik.pensioen) st.push({ id: "potten", titel: "Lijfrente en pensioenpotten", uitleg: "Voeg elke pot toe die je zelf gaat opnemen: saldo, wanneer hij vrijkomt, verwacht rendement en de looptijd van de uitkering.", render: function () { return h(PottenEditor, null); },
      valideer: function (cc) { return foutenLijst(cc.S.potten, foutenPot); }, overslaan: "deze uitkeringen tellen dan niet mee in je inkomen na pensionering." });
    if (c.S.profiel.leef.woning === "koop") st.push({ id: "hypotheek", titel: "Hypotheek", uitleg: "Openstaand bedrag, rente, maandlast en wanneer de aflossing stopt.", render: function () { return h(HypotheekForm, null); },
      valideer: function (cc) { var hy = cc.S.hyp; return getal(hy.bedrag) > 0 ? leeg([hy.maandlast === "" ? "Vul de maandlast in." : null, nietNeg(hy.rente, "Rente"), datumFout(hy.aflosEinde, "Einde aflossing"), datumFout(hy.renteVastTot, "Einde rentevaste periode")]) : []; },
      overslaan: "de hypotheeklast telt dan niet mee." });
    return st;
  }
};
function lastenGroepStappen(c) {
  var LL = lijstL(c.S.profiel), m = c.m;
  var uit = [], uitleg = { Wonen: "Alleen de lasten die bij jouw woonsituatie passen.", Vervoer: "Per auto, passend bij eigen auto, leaseauto, deelauto of geen auto.", "Zorg en verzekeringen": "Per persoon.", Gezin: "Kosten voor kinderen en alimentatie.", Overig: "Overige vaste lasten en eventueel een eigen post." };
  LASTEN_GROEPEN.forEach(function (g, gi) {
    var heeft = LASTEN_CAT.some(function (cat) { return cat.groep === g && cat.wanneer(LL); });
    var laatste = g === "Overig";
    if (!heeft && !laatste) return;
    uit.push({ id: "lasten-" + g, titel: "Vaste lasten: " + g.toLowerCase(), uitleg: uitleg[g] + " Vink aan wat voor jou geldt en vul het bedrag in.",
      render: function () { return h(LastenEditor, { groepen: [g], overig: laatste }); },
      valideer: function (cc) { return foutenLijst(cc.S.lasten.filter(function (x) { var cat = lastCat(x.code); return cat ? cat.groep === g : laatste; }), foutenLast); },
      overslaan: "deze lasten ontbreken dan en het spaargeld lijkt te gunstig." });
  });
  return uit;
}
INTAKE.lasten = {
  titel: "Vaste lasten en dagelijkse uitgaven", stappen: function (c) {
    return lastenGroepStappen(c).concat([{ id: "dagelijks", titel: "Dagelijkse uitgaven", uitleg: "Wat geef je gemiddeld per maand uit aan alles buiten de vaste lasten?", render: function () { return h(DagelijksVeld, null); },
      valideer: function (cc) { return leeg([nietNeg(cc.S.dagelijks.bedrag, "Dagelijkse uitgaven")]); }, overslaan: "dagelijkse uitgaven tellen dan niet mee." }]);
  }
};
INTAKE.vermogen = {
  titel: "Vermogen", stappen: function (c) {
    var g = c.S.profiel.gebruik, st = [];
    st.push({ id: "sparen", titel: "Spaargeld", uitleg: "Je rekeningen waarop je direct kunt opnemen. Alleen bank en soort rekening, geen rekeningnummer.", render: function () { return h(SpaarVeld, null); },
      valideer: function (cc) { return cc.S.verm.rekeningen.length ? foutenRekeningen(cc).filter(function (x) { return !/Voeg minstens/.test(x); }) : []; }, overslaan: "het spaargeld en de prognose ontbreken dan." });
    if (g.deposito) st.push({ id: "deposito", titel: "Deposito's", uitleg: "Elk deposito met bank, bedrag, rente, start en looptijd of einddatum.", render: function () { return h(DepositoEditor, null); },
      valideer: function (cc) { return foutenLijst(cc.S.verm.deposito, foutenDeposito); }, overslaan: "deposito's tellen dan niet mee." });
    if (g.beleggen) st.push({ id: "beleggen", titel: "Beleggingen", uitleg: "Je beleggingsrekeningen. Kies per rekening of het vrij beleggen is of pensioen.", render: function () { return h(BeleggingenEditor, null); },
      valideer: function (cc) { return leeg(cc.S.verm.beleggingen.map(function (b) { return !b.bank ? "Vul bij elke rekening de bank of broker in." : b.waarde === "" ? b.bank + ": vul de waarde in." : nietNeg(b.waarde, b.bank); })); }, overslaan: "beleggingen tellen dan niet mee." });
    st.push({ id: "overig", titel: "Overige bezittingen en schulden", uitleg: "Bijvoorbeeld een auto, schulden, of geld dat je aan anderen hebt uitgeleend. Je woning staat al bij de algemene intake.", render: function () { return h("div", null, h(OverigEditor, null), h("h4", { style: { marginTop: ".8rem" } }, "Schulden en uitstaande leningen"), h(SchuldenEditor, null)); },
      overslaan: "ze tellen dan niet mee in je totale vermogen." });
    if (g.deposito) st.push({ id: "snel", titel: "Snel beschikbaar", uitleg: "Welke deposito's tellen mee als geld dat je snel kunt gebruiken?", render: function () { return h(SnelBeschikbaarVelden, null); } });
    return st;
  }
};
INTAKE.grote = {
  titel: "Grote posten en reserveringen", stappen: [
    { id: "reserveringen", titel: "Reserveringen", uitleg: "Maandelijks sparen voor een doel, zoals vakantie of vervanging van de auto. Het bedrag gaat automatisch op de boekdag naar de pot.", render: function () { return h(ReserveringenEditor, null); },
      valideer: function (c) { return leeg(c.S.grote.reserveringen.map(function (r) { return !r.naam ? "Kies bij elke reservering een doel." : r.maand === "" ? r.naam + ": vul het maandbedrag in." : null; })); }, overslaan: "er worden geen reserveringen verwerkt." },
    { id: "boekingen", titel: "Geplande grote uitgaven en inkomsten", uitleg: "Bijvoorbeeld een verbouwing, een erfenis of een jaarlijkse bonus.", render: function () { return h(BoekingenEditor, null); },
      valideer: function (c) { return foutenLijst(c.S.grote.boekingen, foutenBoeking); }, overslaan: "geplande grote posten ontbreken dan in de prognose." }
  ]
};
INTAKE.advies = {
  titel: "Beleggingsadvies", stappen: [
    { id: "profiel", titel: "Wat voor belegger ben je?", uitleg: "Kies defensief, neutraal of offensief. De app past het advies daarop aan; de rest regelt ze op de achtergrond.", render: function () { return h(AdviesProfielVelden, null); },
      valideer: function (c) { return leeg([!c.S.advies.risico ? "Kies een beleggingsprofiel." : null, !c.S.advies.broker ? "Kies waar je belegt (of 'Anders of weet ik niet')." : null]); } },
    { id: "pf", titel: "Je portefeuille", uitleg: "Upload het overzicht van je broker (csv), plak de lijst of de tekst uit de app, of vul de posities zelf in.", render: function () { return h(AdviesPortefeuille, null); }, overslaan: "er is dan alleen advies over bijbeleggen, niet over je bestaande portefeuille." }
  ]
};
INTAKE.rapport = {
  titel: "Rapport (PDF)", stappen: [
    { id: "kop", titel: "Titel van het rapport", uitleg: "Deze naam komt in de kop van elke pagina. Gebruik geen persoonsgegevens.", render: function (c) { return h(TekstVeld, { label: "Titel", value: c.S.rapport.titel, onChange: function (v) { c.zet("rapport", { titel: v }); }, naam: "rapport-titel" }); },
      valideer: function (c) { return leeg([!c.S.rapport.titel ? "Vul een titel in." : null]); } },
    { id: "onderdelen", titel: "Wat moet erin?", uitleg: "Kies de onderdelen. Standaard staat alles aan.", render: function () { return h(RapportKeuzes, null); } }
  ]
};
