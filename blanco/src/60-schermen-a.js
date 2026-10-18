/* ===== Schermen: Dashboard, Inkomen, Toevoeging inkomen, Lijfrente en pensioen, Vaste lasten ===== */
function KV(p) {
  return h("div", { className: "tabelwrap" }, h("table", null, h("tbody", null, p.rijen.map(function (r, i) {
    return h("tr", { key: i, className: r[2] ? "totaal" : "" }, h("td", null, r[0]), h("td", { className: "get" }, r[1]));
  }))));
}
function nuMaand(m) { return eerstVanMaand(m.peil); }

/* ----- Beleggingsadvies op het Dashboard ----- */
function AdviesOpening() {
  var c = useC(), m = c.m, sim = c.sim;
  var S = useMemo(function () { try { return adviesSamenvatting(m, adviesBerekening(m, sim)); } catch (e) { console.error("advies", e); return null; } }, [m, sim]);
  if (!S || !m.profiel.gebruik.beleggen) return null;
  return h(Kaart, { titel: "Beleggingsadvies", soort: "goed", id: "advies-opening" },
    S.regels.map(function (r, i) { return h("p", { key: i }, r); }),
    h("div", { className: "rij" },
      h(Knop, { soort: "sec", klein: true, onClick: function () { c.nav("advies"); }, naam: "naar-advies" }, "Bekijk het hele advies"),
      h(Knop, { soort: "sec", klein: true, onClick: function () { c.nav("advies"); }, naam: "naar-kopen" }, "Wat kun je kopen?")));
}

/* ----- Dashboard ----- */
function GegevensKaart() {
  var c = useC();
  var s = useState(""), melding = s[0], setMelding = s[1];
  var bm = backupMeta();
  return h(Kaart, { titel: "Je gegevens opslaan en verder gaan" },
    h("p", { className: "klein" }, "Alles staat alleen in deze browser, op dit apparaat. Sla je gegevens regelmatig op als bestand (ook via de balk linksonder). Een nieuwe versie van de app is een nieuw bestand: zet daarna je laatste bestand terug en ga verder met je actuele gegevens."),
    h("div", { className: "rij" },
      h(Knop, { onClick: function () { bewaarBackup(); setMelding("Back-up opgeslagen."); }, naam: "backup-opslaan" }, "Gegevens opslaan als bestand"),
      h("label", { className: "knop sec", style: { display: "inline-block", cursor: "pointer" } }, "Gegevens terugzetten",
        h("input", { type: "file", accept: "application/json,.json", style: { display: "none" }, "data-veld": "backup-bestand", onChange: function (e) { var f = e.target.files[0]; if (f) zetBackupTerug(f, setMelding); e.target.value = ""; } }))),
    melding ? h("p", { className: "klein", role: "status" }, melding) : null,
    h("p", { className: "klein" }, "Laatste back-up: " + (bm ? tijdTekst(bm.tijd) : "nog niet gemaakt") + "."),
    h("details", null, h("summary", { className: "klein" }, "Alle gegevens wissen"),
      h(Knop, { soort: "gevaar", onClick: function () { if (window.confirm("Alle ingevulde gegevens definitief wissen? Maak eerst een back-up.")) { try { Object.keys(window.localStorage).filter(function (k) { return k.indexOf(OPSLAG_VOORVOEGSEL) === 0 || k === BACKUP_META; }).forEach(function (k) { window.localStorage.removeItem(k); }); } catch (e) {} window.location.reload(); } }, naam: "wis-alles" }, "Alles wissen")));
}
function FasenTabel(p) {
  var m = p.m, fasen = useMemo(function () { return fasenLijst(m); }, [m]);
  return h("div", null,
    h(Tabel, { kop: ["Fase", "Netto inkomen", "Lasten", "Saldo"], get: [1, 2, 3], rijen: fasen.map(function (f) {
      return [h("span", null, h("b", null, f.naam), h("br", null), h("span", { className: "klein" }, fmtMaand(f.d))), eur(f.netto), eur(f.lasten.totaal + f.reservering), h("span", { className: f.saldo < 0 ? "rood" : "groen" }, eur(f.saldo))];
    }) }),
    h("p", { className: "klein" }, "Per maand, in de prijzen van het moment zelf (inclusief verwachte indexatie). Lasten inclusief reserveringen."));
}
function SchermDashboard() {
  var c = useC(), m = c.m, S = c.S;
  var punten = useMemo(function () { return aandachtspunten(c); }, [c.m, c.sim, c.S.intake, c.S.actual]);
  var tot = intakeMenus(S.profiel).length, klaar = intakeKlaarAantal(S);
  var volgende = intakeMenus(S.profiel).filter(function (x) { return !(S.intake[x.id] || {}).klaar; })[0];
  var algemeenKlaar = (S.intake.dashboard || {}).klaar;
  var t0 = c.vr[0].t;
  var min12 = Math.min.apply(null, c.sim.maand.slice(0, 13).map(function (r) { return r.min; }));
  return h("div", null,
    !algemeenKlaar ? h("div", { className: "kaart leeg" }, h("h2", null, "Welkom"), h("p", null, "Begin met de algemene intake: een paar vragen over je huishouden, woning en gezin. Daarna stelt de app per onderwerp korte vragen. Alles blijft anoniem."), h(Knop, { onClick: function () { c.openIntake("dashboard"); }, naam: "intake-starten" }, "Intake starten")) : null,
    algemeenKlaar ? h(AdviesOpening, null) : null,
    (algemeenKlaar && (m.bronnen.length || m.potten.length)) ? h(Kaart, { titel: "Netto huishoudinkomen per fase" }, h(FasenTabel, { m: m })) : null,
    algemeenKlaar && punten.length ? h(Kaart, { titel: "Aandachtspunten", id: "aandacht" }, h("ul", { className: "lijst", style: { listStyle: "none", paddingLeft: 0 } }, punten.map(function (a, i) {
      return h("li", { key: i, className: "rij", style: { alignItems: "flex-start", flexWrap: "nowrap" } },
        h("span", { className: "badge " + (a.soort === "fout" ? "fout" : a.soort === "waarschuw" ? "waarschuw" : "") }, a.soort === "fout" ? "Let op" : a.soort === "waarschuw" ? "Check" : "Info"),
        h("span", { style: { flex: 1 } }, a.tekst, " ", a.menu !== "dashboard" ? h("a", { href: "#", onClick: function (e) { e.preventDefault(); c.nav(a.menu); }, style: { color: "#0f766e" } }, "Open") : null));
    }))) : null,
    (algemeenKlaar && heeftGegevens(m, "vermogen")) ? h(Kaart, { titel: "Kerncijfers nu" }, h(KV, { rijen: [["Spaargeld (direct opneembaar)", eur(t0.sparen)], ["Totaal vrij vermogen", eur(t0.vrij)], ["Totaal vermogen", eur(t0.totaal)], ["Laagste spaargeld komende 12 maanden", eur(min12)]] })) : null,
    algemeenKlaar ? h(Kaart, { titel: "Voortgang intake" },
      h("p", null, "Intake: " + klaar + " van " + tot + " menu's voltooid"),
      h("div", { className: "balk" }, h("i", { style: { width: (tot ? klaar / tot * 100 : 0) + "%" } })),
      volgende ? h("div", { className: "rij", style: { marginTop: ".5rem" } }, h(Knop, { onClick: function () { c.nav(volgende.id); c.openIntake(volgende.id); }, naam: "intake-volgende-menu" }, "Verder met: " + volgende.naam)) : h("p", { className: "groen" }, "Alle intakes zijn voltooid.")) : null,
    algemeenKlaar ? h(ActualiseerKaart, null) : null,
    algemeenKlaar ? h(Kaart, { titel: "Cijfers bijwerken" }, h(CijfersKnop, null), h("details", { style: { marginTop: ".5rem" } }, h("summary", { className: "klein" }, "Bedragen indexeren (toeslagen, inkomen, lasten)"), h(IndexeerKaart, null))) : null,
    algemeenKlaar ? h(UitbreidenKaart, null) : null,
    h(Kaart, { titel: "Basisgegevens" }, h("details", null, h("summary", { className: "klein" }, "Huishouden, geboortedatum en onderdelen aanpassen"), h(BasisGegevens, null), h(PeildatumVeld, null), h(MinimumVeld, null), h(AowKaart, null), h(WoningVelden, null), h(AutoVelden, null), h(GezinVelden, null), h(ProductenVelden, null)),
      h("div", { className: "rij", style: { marginTop: ".4rem" } }, h(Knop, { soort: "sec", klein: true, onClick: function () { c.openIntake("dashboard"); }, naam: "intake-opnieuw" }, "Algemene intake opnieuw"))),
    h(GegevensKaart, null));
}

/* ----- Inkomen ----- */
function SchermInkomen() {
  var c = useC(), m = c.m, d0 = nuMaand(m);
  return h("div", null,
    h(IntakeKnop, { menu: "inkomen" }),
    !m.bronnen.length ? h(LegeStaat, { menu: "inkomen", tekst: "Er zijn nog geen inkomsten ingevuld. Start de intake om loon, uitkeringen, pensioen en toeslagen in te vullen." }) : null,
    m.personen.map(function (p) {
      var pm = persoonMaand(m, p.id, d0);
      return h(Kaart, { key: p.id, titel: p.naam },
        h("p", { className: "klein" }, p.aow ? "AOW-datum: " + fmtDatum(p.aow) : "Geen geboortedatum bekend, dus geen AOW-datum."),
        h(BronnenEditor, { persoon: p.id }),
        pm.lijst.length ? h("div", { style: { marginTop: ".6rem" } }, h("h4", null, "Nu per maand"), pm.kortingBij ? h("p", { className: "klein" }, "Heffingskorting is automatisch toegepast op je hoogste inkomen: " + pm.kortingBij + ".") : null,
          h(Tabel, { kop: ["Bron", "Bruto", "Netto"], get: [1, 2], rijen: pm.lijst.map(function (x) { return [x.naam, eur(x.bruto), eur(x.netto)]; }).concat([{ klasse: "totaal", cellen: ["Totaal", eur(pm.bruto), eur(pm.netto)] }]) })) : null);
    }),
    (lijstL(m.profiel).kbAuto) ? h(Kaart, { titel: "Kinderbijslag (automatisch)" },
      h(Tabel, { kop: ["Kind", "Leeftijd", "Per kwartaal", "Laatste kwartaal"], get: [1, 2], rijen: (m.profiel.kids || []).map(function (k, i) {
        var g = geldigeDatum(k.geboorte), l = kinderbijslagLaatsteKwartaalEind(k.geboorte);
        return ["Kind " + (i + 1) + (k.beperking ? " (dubbel)" : ""), g ? leeftijdJaren(g, m.peil) + " jaar" : "–", eur(kinderbijslagKwartaal(m, k.geboorte, kwartaalStart(m.peil), k.beperking)), l ? fmtMaand(l) : "–"];
      }) }),
      h("p", { className: "klein" }, "Bedragen van de SVB per kind per kwartaal; ze worden achteraf betaald (januari, april, juli en oktober). Bij een kind met een beperking en intensieve zorg is de kinderbijslag dubbel (3 tot en met 17 jaar). Het bedrag stijgt in het kwartaal waarin je kind 6 en 12 wordt en stopt als je kind op de eerste dag van een kwartaal 18 is. Voor 2027 en later houdt de app de bedragen van nu aan met jaarlijkse indexatie.")) : null,
    m.bronnen.some(function (b) { return b.soort === "loon"; }) ? h(Kaart, { titel: "Werken of stoppen per jaar" }, h(WerkJarenTabel, null)) : null,
    h(Kaart, { titel: "AOW" }, h(AowKaart, null)),
    h(Kaart, { titel: "Parameters" }, h("p", { className: "klein" }, "Indexatie per bron stel je hierboven in. Het CPI-percentage (nu " + pct(m.inst.cpi, 1) + ") wordt bijgehouden via 'Cijfers bijwerken' op het Dashboard. Inkomen wordt per 1 januari geïndexeerd; vaste lasten per maand."),
      h("p", { className: "klein" }, "Een bron telt voor hele maanden mee. Loon telt niet meer mee vanaf de maand van de AOW-datum; de AOW telt vanaf die maand wel mee.")));
}

/* ----- Toevoeging inkomen ----- */
function SchermAanvulling() {
  var c = useC(), m = c.m, g = m.profiel.gebruik.aanvulling, plan = aanvulPlan(m);
  var jaren = {};
  plan.forEach(function (x) { var j = x.d.getFullYear(); jaren[j] = jaren[j] || { opname: 0, saldo: 0 }; jaren[j].opname += x.opname; jaren[j].saldo = x.saldo; });
  var rijen = Object.keys(jaren).filter(function (j) { return jaren[j].opname > 0.5 || jaren[j].saldo > 0.5; }).map(function (j) { return [j, eur(jaren[j].opname), eur(jaren[j].saldo)]; });
  var eindIndex = plan.length ? plan.map(function (x) { return x.saldo; }).findIndex(function (s, i) { return s <= 0.5 && i > 0; }) : -1;
  return h("div", null,
    h(IntakeKnop, { menu: "aanvulling" }),
    h(Kaart, { titel: "Inkomensaanvulling" },
      h(Vink, { label: "Ik wil mijn inkomen aanvullen uit mijn vermogen", value: g, onChange: function (v) { c.zetPad("profiel", ["gebruik", "aanvulling"], v); } }),
      g ? h(AanvulVelden, null) : h("p", { className: "klein" }, "Zet dit aan om in te vullen hoeveel je per maand extra nodig hebt; de app toetst of dat kan met je spaargeld of beleggingen.")),
    plan.length ? h(Kaart, { titel: "Verloop van het gereserveerde bedrag" },
      h(Tabel, { kop: ["Jaar", "Opname", "Over einde jaar"], get: [1, 2], rijen: rijen.slice(0, 40) }),
      eindIndex > 0 ? h("p", { className: "oranje" }, "Het gereserveerde bedrag is op in " + fmtMaand(plan[eindIndex].d) + ".") : h("p", { className: "klein" }, "Het gereserveerde bedrag is niet op binnen de berekende periode."),
      h("p", { className: "klein" }, "Opnames zijn netto en tellen mee in je inkomen. Rendement wordt per maand bijgeschreven.")) : null,
    g ? h("details", null, h("summary", { className: "klein" }, "Geavanceerd: extra storten of afromen"), h(AanvulMutaties, null)) : null);
}

/* ----- Lijfrente en pensioen ----- */
function SchermPensioen() {
  var c = useC(), m = c.m;
  var hy = hypOp(m, m.peil);
  return h("div", null,
    h(IntakeKnop, { menu: "pensioen" }),
    ((m.profiel.gebruik.pensioen || m.profiel.leef.woning === "koop") && !m.potten.length && !(m.hyp.delen || []).length) ? h(LegeStaat, { menu: "pensioen", tekst: "Er zijn nog geen lijfrentes, pensioenpotten of hypotheek ingevuld." }) : null,
    m.profiel.gebruik.pensioen ? h(Kaart, { titel: "Lijfrente en pensioenpotten" }, h(PottenEditor, null)) : h(Kaart, { titel: "Lijfrente en pensioenpotten" }, h("p", { className: "klein" }, "Je hebt aangegeven geen lijfrente of pensioenpotten te hebben die je zelf opneemt."), h(Knop, { soort: "sec", klein: true, onClick: function () { c.zetPad("profiel", ["gebruik", "pensioen"], true); c.openIntake("pensioen"); }, naam: "start-pensioen" }, "Lijfrente of pensioenpot toevoegen")),
    m.potten.length ? h(Kaart, { titel: "Netto-opbouw van het inkomen na de AOW" }, m.personen.map(function (p) {
      if (!p.aow) return h("p", { key: p.id, className: "klein" }, p.naam + ": geen AOW-datum bekend.");
      var d = plusMaanden(eerstVanMaand(p.aow), 1), pm = persoonMaand(m, p.id, d);
      return h("div", { key: p.id }, h("h4", null, p.naam + " vanaf " + fmtMaand(d)),
        h(Tabel, { kop: ["Bron", "Bruto", "Netto"], get: [1, 2], rijen: pm.lijst.map(function (x) { return [x.naam, eur(x.bruto), eur(x.netto)]; }).concat([{ klasse: "totaal", cellen: ["Totaal per maand", eur(pm.bruto), eur(pm.netto)] }]) }));
    }), h("p", { className: "klein" }, "Netto is een schatting met de fiscale tabel; zie Fiscaliteit & AOW voor de aannames.")) : null,
    m.profiel.leef.woning === "koop" ? h(Kaart, { titel: "Hypotheek" }, h(HypotheekForm, null),
      (m.hyp.delen || []).length ? h("div", null,
        h("h4", { style: { marginTop: ".6rem" } }, "Overzicht"),
        h(Tabel, { kop: ["Deel", "Openstaand", "Maandlast", "Rente herzien"], get: [1, 2], rijen: m.hyp.delen.map(function (dl, i) { var r = hypDeelOp(m, dl, m.peil); return ["Deel " + (i + 1) + " (box " + (dl.box || "?") + ")", eur(r.saldo), eur(r.maandlast), dl.variabel ? "variabel" : fmtDatum(dl.herzienDatum)]; }).concat([{ klasse: "totaal", cellen: ["Totaal", eur(hy.saldo), eur(hy.maandlast), ""] }]) }),
        (function () { var v = hypVoordeel(m, m.peil); return v ? h("p", { className: "klein" }, (v.maand >= 0 ? "Belastingvoordeel van de rente: circa " : "Belastingnadeel door het eigenwoningforfait: circa ") + eur(Math.abs(v.maand)) + " per maand (rente box 1 " + eur(v.rente) + " per jaar, eigenwoningforfait " + eur(v.ewf) + "), toegerekend aan " + persoonVan(m, v.pid).naam + ".") : null; })(),
        h("p", { className: "klein" }, "Openstaand over 5 jaar: " + eur(hypOp(m, plusJaren(m.peil, 5)).saldo) + ".")) : null) : null);
}

/* ----- Vaste lasten en dagelijkse uitgaven ----- */
function SchermLasten() {
  var c = useC(), m = c.m, l = lastenPerMaandGemiddeld(m, nuMaand(m));
  var fasen = useMemo(function () { return fasenLijst(m); }, [m]);
  return h("div", null,
    h(IntakeKnop, { menu: "lasten" }),
    (!m.lasten.length && !getal(m.dagelijks.bedrag)) ? h(LegeStaat, { menu: "lasten", tekst: "Er zijn nog geen vaste lasten of dagelijkse uitgaven ingevuld." }) : null,
    h(Kaart, { titel: "Vaste lasten" }, h(LastenEditor, null)),
    h(Kaart, { titel: "Dagelijkse uitgaven" }, h(DagelijksVeld, null)),
    h(Kaart, { titel: "Inflatie (CPI)", id: "cpi-kaart" }, h(CpiKaart, null)),
    h(Kaart, { titel: "Overzicht per maand nu" }, h(KV, { rijen: [["Vaste lasten (gemiddeld)", eur(l.vast)], ["Dagelijkse uitgaven", eur(l.dagelijks)], ["Hypotheek", eur(l.hypotheek)], ["Reserveringen", eur(reserveringMaandTotaal(m, nuMaand(m)))], ["Totaal", eur(l.totaal + reserveringMaandTotaal(m, nuMaand(m))), true]] })),
    (m.lasten.length || getal(m.dagelijks.bedrag)) ? h(Kaart, { titel: "Lasten per fase" }, h(Tabel, { kop: ["Fase", "Vast", "Dagelijks", "Totaal"], get: [1, 2, 3], rijen: fasen.map(function (f) { return [f.naam, eur(f.lasten.vast + f.lasten.hypotheek), eur(f.lasten.dagelijks), eur(f.lasten.totaal)]; }) })) : null);
}
