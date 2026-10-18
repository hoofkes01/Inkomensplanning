/* ===== Intake per menu: korte, begeleide vragenlijsten ===== */
function foutenLijst(items, f) { var uit = []; items.forEach(function (x) { uit = uit.concat(f(x)); }); return uit; }

INTAKE.dashboard = {
  titel: "Dashboard", stappen: [
    { id: "personen", titel: "Wie plan je?", uitleg: "Je kunt voor jezelf of voor twee personen plannen. Namen mogen een voornaam of aanduiding zijn; ze worden alleen in de app en het rapport gebruikt.",
      render: function () { return h(BasisGegevens, null); },
      valideer: function (c) { return leeg([!c.S.profiel.naamA ? "Vul een naam of aanduiding in voor persoon A." : null, c.S.profiel.partner && !c.S.profiel.naamB ? "Vul een naam of aanduiding in voor persoon B." : null,
        c.S.profiel.geboorteA && !geldigeDatum(c.S.profiel.geboorteA) ? "Geboortedatum van persoon A is niet geldig." : null,
        c.S.profiel.partner && c.S.profiel.geboorteB && !geldigeDatum(c.S.profiel.geboorteB) ? "Geboortedatum van persoon B is niet geldig." : null,
        (geldigeDatum(c.S.profiel.geboorteA) && geldigeDatum(c.S.profiel.geboorteA) > c.m.nu) ? "Geboortedatum van persoon A ligt in de toekomst." : null]); },
      overslaan: "zonder geboortedatum kan de AOW-datum niet worden berekend." },
    { id: "aow", titel: "AOW-datum", uitleg: "De app berekent de AOW-datum uit de geboortedatum. Dat is de verwachte AOW-leeftijd; pas hem aan als jouw datum afwijkt (kijk op svb.nl).",
      render: function () { return h(AowKaart, null); }, overslaan: "de app rekent dan met de berekende datum, of zonder AOW als de geboortedatum ontbreekt." },
    { id: "onderdelen", titel: "Peildatum en onderdelen", uitleg: "Kies welke onderdelen voor jou gelden. Niet gekozen onderdelen worden verborgen in de berekeningen.",
      render: function () { return h("div", null, h(PeildatumVeld, null), h(GebruikSchakelaars, null)); },
      valideer: function (c) { return leeg([datumFout(c.S.profiel.peildatum, "Peildatum")]); } }
  ]
};
INTAKE.inkomen = {
  titel: "Inkomen", stappen: [
    { id: "A", titel: "Inkomen van persoon A", uitleg: "Voeg elke inkomensbron toe: loon, uitkering, pensioen of overig inkomen. De AOW rekent de app zelf uit.",
      render: function (c) { return h(BronnenEditor, { persoon: "A" }); },
      valideer: function (c) { return foutenLijst(c.S.bronnen.filter(function (b) { return b.persoon === "A"; }), foutenBron); },
      overslaan: "het inkomen van persoon A telt dan niet mee; de uitkomsten kloppen niet." },
    { id: "B", titel: "Inkomen van persoon B", uitleg: "Dezelfde vragen voor je partner. Heb je geen partner, dan zie je hier niets.",
      render: function (c) { return c.S.profiel.partner ? h(BronnenEditor, { persoon: "B" }) : h("p", null, "Je plant zonder partner. Ga naar de volgende stap."); },
      valideer: function (c) { return foutenLijst(c.S.bronnen.filter(function (b) { return b.persoon === "B"; }), foutenBron); },
      overslaan: "het inkomen van persoon B telt dan niet mee." },
    { id: "werken", titel: "Werken of stoppen", uitleg: "Per jaar tot de pensioendatum: werk je dat jaar nog? Loon telt in jaren zonder vinkje niet mee.", render: function () { return h(WerkJarenTabel, null); },
      overslaan: "de app gaat ervan uit dat je werkt tot de AOW-datum of de einddatum van je loon." }
  ]
};
INTAKE.aanvulling = {
  titel: "Toevoeging inkomen", stappen: [
    { id: "gebruik", titel: "Heb je een pot die je inkomen aanvult?", uitleg: "Bijvoorbeeld een bedrag dat je maandelijks opneemt tot de AOW begint.",
      render: function (c) { return h(Vink, { label: "Ja, ik gebruik een inkomensaanvulling", value: c.S.profiel.gebruik.aanvulling, onChange: function (v) { c.zetPad("profiel", ["gebruik", "aanvulling"], v); } }); } },
    { id: "pot", titel: "De pot", uitleg: "Saldo, maandelijkse opname, rendement en kosten.", render: function (c) { return c.S.profiel.gebruik.aanvulling ? h(AanvulVelden, null) : h("p", null, "Je gebruikt geen inkomensaanvulling. Ga verder."); },
      valideer: function (c) { return c.S.profiel.gebruik.aanvulling ? foutenAanv(c.S.aanv) : []; }, overslaan: "de aanvulling telt dan niet mee in je inkomen." },
    { id: "mutaties", titel: "Bijstorten of afromen", uitleg: "Geplande stortingen in de pot of bedragen die je eruit haalt.", render: function (c) { return c.S.profiel.gebruik.aanvulling ? h(AanvulMutaties, null) : h("p", null, "Niet van toepassing."); }, overslaan: "er worden geen extra stortingen of opnames verwerkt." }
  ]
};
INTAKE.pensioen = {
  titel: "Lijfrente en pensioen", stappen: [
    { id: "potten", titel: "Lijfrente en pensioenpotten", uitleg: "Voeg elke pot toe die je zelf gaat opnemen: saldo, wanneer hij vrijkomt, verwacht rendement en de looptijd van de uitkering.",
      render: function (c) { return c.S.profiel.gebruik.pensioen ? h(PottenEditor, null) : h("p", null, "Je hebt aangegeven geen potten te hebben. Dat pas je aan op het Dashboard."); },
      valideer: function (c) { return foutenLijst(c.S.potten, foutenPot); }, overslaan: "deze uitkeringen tellen dan niet mee in je inkomen na pensionering." },
    { id: "hypotheek", titel: "Hypotheek", uitleg: "Openstaand bedrag, rente, maandlast en wanneer de aflossing stopt.", render: function () { return h(HypotheekForm, null); },
      valideer: function (c) { var hy = c.S.hyp; return c.S.profiel.gebruik.hypotheek ? leeg([getal(hy.bedrag) <= 0 ? "Vul het openstaande bedrag in." : null, hy.maandlast === "" ? "Vul de maandlast in." : null, nietNeg(hy.rente, "Rente"), datumFout(hy.aflosEinde, "Einde aflossing"), datumFout(hy.renteVastTot, "Einde rentevaste periode")]) : []; },
      overslaan: "de hypotheeklast telt dan niet mee." }
  ]
};
INTAKE.lasten = {
  titel: "Vaste lasten en dagelijkse uitgaven", stappen: [
    { id: "posten", titel: "Vaste lasten", uitleg: "Elke vaste post met bedrag, hoe vaak je betaalt en of het bedrag meestijgt met de inflatie.", render: function () { return h(LastenEditor, null); },
      valideer: function (c) { return foutenLijst(c.S.lasten, foutenLast); }, overslaan: "je lasten ontbreken dan en het spaargeld lijkt te gunstig." },
    { id: "dagelijks", titel: "Dagelijkse uitgaven", uitleg: "Wat geef je gemiddeld per maand uit aan alles buiten de vaste lasten?", render: function () { return h(DagelijksVeld, null); },
      valideer: function (c) { return leeg([nietNeg(c.S.dagelijks.bedrag, "Dagelijkse uitgaven")]); }, overslaan: "dagelijkse uitgaven tellen dan niet mee." },
    { id: "cpi", titel: "Inflatie (CPI)", uitleg: "Het verwachte inflatiepercentage en de maand waarop je bedragen kloppen. Controleer de CPI elke maand.", render: function () { return h(CpiKaart, null); },
      overslaan: "de app rekent met de standaardaanname en meldt dat de CPI niet is gecontroleerd." }
  ]
};
INTAKE.vermogen = {
  titel: "Vermogen", stappen: [
    { id: "sparen", titel: "Spaargeld", uitleg: "Wat staat er direct opneembaar op je spaarrekening(en) en welke rente krijg je?", render: function () { return h(SpaarVeld, null); },
      valideer: function (c) { return leeg([nietNeg(c.S.verm.spaar, "Spaargeld"), nietNeg(c.S.inst.spaarrente, "Spaarrente")]); }, overslaan: "het spaargeld en de prognose ontbreken dan." },
    { id: "deposito", titel: "Deposito's", uitleg: "Elk deposito met bedrag, rente, start en looptijd of einddatum.", render: function () { return h(DepositoEditor, null); },
      valideer: function (c) { return c.S.profiel.gebruik.deposito ? foutenLijst(c.S.verm.deposito, foutenDeposito) : []; }, overslaan: "deposito's tellen dan niet mee." },
    { id: "beleggen", titel: "Beleggingen", uitleg: "Je beleggingsrekeningen. Kies per rekening of het vrij beleggen is of pensioen.", render: function () { return h(BeleggingenEditor, null); },
      valideer: function (c) { return leeg(c.S.verm.beleggingen.map(function (b) { return b.waarde === "" ? (b.naam || "Rekening") + ": vul de waarde in." : nietNeg(b.waarde, b.naam || "Rekening"); })); }, overslaan: "beleggingen tellen dan niet mee." },
    { id: "overig", titel: "Overige bezittingen en schulden", uitleg: "Bijvoorbeeld een woning of auto, schulden, of geld dat je aan anderen hebt uitgeleend.", render: function () { return h("div", null, h(OverigEditor, null), h("h4", { style: { marginTop: ".8rem" } }, "Schulden en uitstaande leningen"), h(SchuldenEditor, null)); },
      overslaan: "ze tellen dan niet mee in je totale vermogen." },
    { id: "snel", titel: "Snel beschikbaar", uitleg: "Welke deposito's tellen mee als geld dat je snel kunt gebruiken?", render: function () { return h(SnelBeschikbaarVelden, null); } }
  ]
};
INTAKE.grote = {
  titel: "Grote posten en reserveringen", stappen: [
    { id: "minimum", titel: "Minimaal spaargeld", uitleg: "Het bedrag dat altijd op je spaarrekening moet blijven staan als buffer.", render: function () { return h("div", null, h(MinimumVeld, null), h(Uitleg, null, "Het startsaldo is het spaargeld dat je bij Vermogen hebt ingevuld.")); },
      valideer: function (c) { return leeg([nietNeg(c.S.grote.minimum, "Minimum")]); } },
    { id: "reserveringen", titel: "Reserveringen", uitleg: "Maandelijks sparen voor een doel. Het bedrag gaat automatisch op de boekdag naar de pot.", render: function () { return h(ReserveringenEditor, null); },
      valideer: function (c) { return leeg(c.S.grote.reserveringen.map(function (r) { return !r.naam ? "Geef elke reservering een naam." : r.maand === "" ? (r.naam) + ": vul het maandbedrag in." : null; })); }, overslaan: "er worden geen reserveringen verwerkt." },
    { id: "boekingen", titel: "Geplande grote uitgaven en inkomsten", uitleg: "Bijvoorbeeld een verbouwing, een erfenis of een jaarlijkse bonus.", render: function () { return h(BoekingenEditor, null); },
      valideer: function (c) { return foutenLijst(c.S.grote.boekingen, foutenBoeking); }, overslaan: "geplande grote posten ontbreken dan in de prognose." }
  ]
};
INTAKE.fiscaal = {
  titel: "Fiscaliteit & AOW", stappen: [
    { id: "tabel", titel: "Controle fiscale tabel", uitleg: "De app rekent met de cijfers van de Belastingdienst en de SVB. Kijk of het jaar en de status kloppen. Afwijkende waarden vul je later in bij Fiscaliteit & AOW.", render: function (c) { return h(FiscaalSamenvatting, null); } },
    { id: "box3", titel: "Box 3", uitleg: "Kies het stelsel. De standaardwaarden komen van de Belastingdienst.", render: function () { return h(Box3Velden, null); },
      valideer: function (c) { var b = c.S.box3; return leeg([nietNeg(b.tarief, "Tarief"), nietNeg(b.vrijPP, "Heffingsvrij vermogen"), nietNeg(b.sparenPct, "Rendement sparen"), nietNeg(b.beleggenPct, "Rendement beleggen")]); }, overslaan: "de app gebruikt de standaardwaarden." }
  ]
};
INTAKE.advies = {
  titel: "Beleggingsadvies", stappen: [
    { id: "doel", titel: "Doelverdeling en drempel", uitleg: "Hoe wil je vrij beleggen verdelen over offensief, neutraal en defensief, en hoeveel spaargeld moet altijd direct beschikbaar blijven?", render: function () { return h(AdviesDoelVelden, null); },
      valideer: function (c) { var a = c.S.advies; return leeg([getal(a.doelOff) + getal(a.doelNeu) + getal(a.doelDef) <= 0 ? "Vul minstens één percentage in voor de doelverdeling." : null, nietNeg(a.drempel, "Drempel")]); } },
    { id: "voorkeur", titel: "Voorkeuren", uitleg: "Wil je bepaalde fondsen nooit verkopen? Dat geef je aan bij de portefeuille. Hier stel je ook een wachtgrens in.", render: function () { return h(AdviesVoorkeurVelden, null); },
      valideer: function (c) { return leeg([nietNeg(c.S.advies.wachtTot, "Wachtgrens")]); }, overslaan: "er geldt dan geen wachtgrens." },
    { id: "pf", titel: "Je portefeuille", uitleg: "Upload een DEGIRO-csv, plak de lijst of de tekst uit de DEGIRO-app, of vul de posities zelf in.", render: function () { return h(AdviesPortefeuille, null); }, overslaan: "er is dan alleen advies over bijbeleggen, niet over je bestaande portefeuille." },
    { id: "rente", titel: "Rente-referenties", uitleg: "De app kan Raisin en Euribor niet zelf ophalen. Vul de actuele rentes in en noteer de datum.", render: function () { return h(AdviesRenteVelden, null); },
      valideer: function (c) { return leeg([nietNeg(c.S.advies.raisin6, "Raisin-rente"), nietNeg(c.S.advies.euribor, "Euribor")]); }, overslaan: "de app rekent met de standaardwaarden en meldt dat ze niet zijn gecontroleerd." }
  ]
};
INTAKE.rapport = {
  titel: "Rapport (PDF)", stappen: [
    { id: "kop", titel: "Titel van het rapport", uitleg: "Deze naam komt in de kop van elke pagina.", render: function (c) { return h(TekstVeld, { label: "Titel", value: c.S.rapport.titel, onChange: function (v) { c.zet("rapport", { titel: v }); }, naam: "rapport-titel" }); },
      valideer: function (c) { return leeg([!c.S.rapport.titel ? "Vul een titel in." : null]); } },
    { id: "onderdelen", titel: "Wat moet erin?", uitleg: "Kies de onderdelen. Standaard staat alles aan.", render: function () { return h(RapportKeuzes, null); } }
  ]
};
