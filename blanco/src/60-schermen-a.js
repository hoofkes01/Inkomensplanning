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
  var P = adviesParams(m);
  return h(Kaart, { titel: "Beleggingsadvies", soort: "goed", id: "advies-opening" },
    S.regels.map(function (r, i) { return h("p", { key: i }, r); }),
    h("p", { className: "klein" }, "Deposito 6 maanden (Raisin): " + pct(P.raisin, 2) + " bruto, stand " + ((m.advies.raisinStand) ? fmtDatum(m.advies.raisinStand) : "niet gecontroleerd") + ". Na belasting " + pct(adviesNettoRaisin(P), 2) + "."),
    ouderDan(m.advies.raisinStand, 7, m.nu) ? h("p", { className: "oranje" }, h("b", null, "Controleer de Raisin-rente: de stand is ouder dan 7 dagen of niet ingevuld. De app kan Raisin niet zelf opvragen.")) : null,
    h(Knop, { soort: "sec", klein: true, onClick: function () { c.nav("advies"); }, naam: "naar-advies" }, "Bekijk het hele advies"));
}

/* ----- Dashboard ----- */
function GegevensKaart() {
  var c = useC();
  var s = useState(""), melding = s[0], setMelding = s[1];
  return h(Kaart, { titel: "Je gegevens" },
    h("p", { className: "klein" }, "Alles staat alleen in deze browser, op dit apparaat. Maak regelmatig een back-up. Een nieuwe versie van de app is een nieuw bestand: zet daarna je back-up terug."),
    h("div", { className: "rij" },
      h(Knop, { onClick: function () { downloadBackup(); c.zet("inst", { backupDatum: isoDatum(vandaag()) }); setMelding("Back-up opgeslagen."); }, naam: "backup-opslaan" }, "Gegevens opslaan als bestand"),
      h("label", { className: "knop sec", style: { display: "inline-block", cursor: "pointer" } }, "Gegevens terugzetten",
        h("input", { type: "file", accept: "application/json,.json", style: { display: "none" }, "data-veld": "backup-bestand", onChange: function (e) { var f = e.target.files[0]; if (f) zetBackupTerug(f, setMelding); e.target.value = ""; } }))),
    melding ? h("p", { className: "klein", role: "status" }, melding) : null,
    h("p", { className: "klein" }, "Laatste back-up: " + (c.S.inst.backupDatum ? fmtDatum(c.S.inst.backupDatum) : "nog niet gemaakt") + "."),
    h("details", null, h("summary", { className: "klein" }, "Alle gegevens wissen"),
      h(Knop, { soort: "gevaar", onClick: function () { if (window.confirm("Alle ingevulde gegevens definitief wissen? Maak eerst een back-up.")) { try { Object.keys(window.localStorage).filter(function (k) { return k.indexOf(OPSLAG_VOORVOEGSEL) === 0; }).forEach(function (k) { window.localStorage.removeItem(k); }); } catch (e) {} window.location.reload(); } }, naam: "wis-alles" }, "Alles wissen")));
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
  var punten = useMemo(function () { return aandachtspunten(c); }, [c.m, c.sim, c.S.intake]);
  var klaar = MENUS.filter(function (x) { return (S.intake[x.id] || {}).klaar; }).length;
  var volgende = MENUS.filter(function (x) { return !(S.intake[x.id] || {}).klaar; })[0];
  var nogLeeg = !S.profiel.geboorteA && !S.bronnen.length && !getal(S.verm.spaar);
  var t0 = c.vr[0].t;
  var min12 = Math.min.apply(null, c.sim.maand.slice(0, 13).map(function (r) { return r.min; }));
  return h("div", null,
    h(Kaart, { titel: "Voortgang intake" },
      h("p", null, "Intake: " + klaar + " van " + MENUS.length + " menu's voltooid"),
      h("div", { className: "balk" }, h("i", { style: { width: (klaar / MENUS.length * 100) + "%" } })),
      volgende ? h("div", { className: "rij", style: { marginTop: ".5rem" } }, h(Knop, { onClick: function () { c.nav(volgende.id); c.openIntake(volgende.id); }, naam: "intake-volgende-menu" }, "Verder met: " + volgende.naam)) : h("p", { className: "groen" }, "Alle intakes zijn voltooid.")),
    nogLeeg ? h("div", { className: "kaart leeg" }, h("h2", null, "Welkom"), h("p", null, "De app is nog leeg. Begin met de intake van het Dashboard; daarna kies je via ☰ Menu de andere onderwerpen."), h(Knop, { onClick: function () { c.openIntake("dashboard"); }, naam: "intake-starten" }, "Intake starten")) : null,
    punten.length ? h(Kaart, { titel: "Aandachtspunten", id: "aandacht" }, h("ul", { className: "lijst", style: { listStyle: "none", paddingLeft: 0 } }, punten.map(function (a, i) {
      return h("li", { key: i, className: "rij", style: { alignItems: "flex-start", flexWrap: "nowrap" } },
        h("span", { className: "badge " + (a.soort === "fout" ? "fout" : a.soort === "waarschuw" ? "waarschuw" : "") }, a.soort === "fout" ? "Let op" : a.soort === "waarschuw" ? "Check" : "Info"),
        h("span", { style: { flex: 1 } }, a.tekst, " ", a.menu !== "dashboard" ? h("a", { href: "#", onClick: function (e) { e.preventDefault(); c.nav(a.menu); }, style: { color: "#0f766e" } }, "Open") : null));
    }))) : null,
    h(AdviesOpening, null),
    heeftGegevens(m, "vermogen") ? h(Kaart, { titel: "Kerncijfers nu" }, h(KV, { rijen: [["Spaargeld (direct opneembaar)", eur(t0.sparen)], ["Totaal vrij vermogen", eur(t0.vrij)], ["Totaal vermogen", eur(t0.totaal)], ["Laagste spaargeld komende 12 maanden", eur(min12)]] })) : null,
    (m.bronnen.length || m.potten.length) ? h(Kaart, { titel: "Netto huishoudinkomen per fase" }, h(FasenTabel, { m: m })) : null,
    h(Kaart, { titel: "Basisgegevens" }, h(BasisGegevens, null), h(PeildatumVeld, null), h(GebruikSchakelaars, null), h(AowKaart, null)),
    h(GegevensKaart, null));
}

/* ----- Inkomen ----- */
function SchermInkomen() {
  var c = useC(), m = c.m, d0 = nuMaand(m);
  return h("div", null,
    h(IntakeKnop, { menu: "inkomen" }),
    !m.bronnen.length ? h(LegeStaat, { menu: "inkomen", tekst: "Er zijn nog geen inkomensbronnen. Start de intake om loon, uitkeringen en pensioen in te vullen." }) : null,
    m.personen.map(function (p) {
      var pm = persoonMaand(m, p.id, d0);
      return h(Kaart, { key: p.id, titel: p.naam },
        h("p", { className: "klein" }, p.aow ? "AOW-datum: " + fmtDatum(p.aow) : "Geen geboortedatum bekend, dus geen AOW-datum."),
        h(BronnenEditor, { persoon: p.id }),
        pm.lijst.length ? h("div", { style: { marginTop: ".6rem" } }, h("h4", null, "Nu per maand"),
          h(Tabel, { kop: ["Bron", "Bruto", "Netto"], get: [1, 2], rijen: pm.lijst.map(function (x) { return [x.naam, eur(x.bruto), eur(x.netto)]; }).concat([{ klasse: "totaal", cellen: ["Totaal", eur(pm.bruto), eur(pm.netto)] }]) })) : null);
    }),
    m.bronnen.length ? h(Kaart, { titel: "Werken of stoppen per jaar" }, h(WerkJarenTabel, null)) : null,
    h(Kaart, { titel: "AOW" }, h(AowKaart, null)),
    h(Kaart, { titel: "Parameters" }, h("p", { className: "klein" }, "Indexatie per bron stel je hierboven in. Het CPI-percentage (nu " + pct(m.inst.cpi, 1) + ") pas je aan bij Vaste lasten en dagelijkse uitgaven. Inkomen wordt per 1 januari geïndexeerd; vaste lasten per maand."),
      h("p", { className: "klein" }, "Een bron telt voor hele maanden mee. Loon telt niet meer mee vanaf de maand van de AOW-datum; de AOW telt vanaf die maand wel mee.")));
}

/* ----- Toevoeging inkomen ----- */
function SchermAanvulling() {
  var c = useC(), m = c.m, g = m.profiel.gebruik.aanvulling, plan = aanvulPlan(m);
  var jaren = {};
  plan.forEach(function (x) { var j = x.d.getFullYear(); jaren[j] = jaren[j] || { opname: 0, saldo: 0 }; jaren[j].opname += x.opname; jaren[j].saldo = x.saldo; });
  var rijen = Object.keys(jaren).map(function (j) { return [j, eur(jaren[j].opname), eur(jaren[j].saldo)]; });
  var eindIndex = plan.length ? plan.map(function (x) { return x.saldo; }).findIndex(function (s, i) { return s <= 0.5 && i > 0; }) : -1;
  return h("div", null,
    h(IntakeKnop, { menu: "aanvulling" }),
    h(Kaart, { titel: "Inkomensaanvulling" },
      h(Vink, { label: "Ik gebruik een pot die mijn inkomen aanvult", value: g, onChange: function (v) { c.zetPad("profiel", ["gebruik", "aanvulling"], v); } }),
      g ? h(AanvulVelden, null) : h("p", { className: "klein" }, "Zet dit aan om een pot in te vullen die je inkomen tot de AOW aanvult.")),
    g ? h(Kaart, { titel: "Bijstorten of afromen" }, h(AanvulMutaties, null)) : null,
    (g && !plan.length) ? h(LegeStaat, { menu: "aanvulling", tekst: "Vul het saldo van de pot in om het verloop te zien." }) : null,
    plan.length ? h(Kaart, { titel: "Verloop van de pot" },
      h(Tabel, { kop: ["Jaar", "Opname", "Saldo einde jaar"], get: [1, 2], rijen: rijen.slice(0, 40) }),
      eindIndex > 0 ? h("p", { className: "oranje" }, "De pot is leeg in " + fmtMaand(plan[eindIndex].d) + ".") : h("p", { className: "klein" }, "De pot is niet leeg binnen de berekende periode."),
      h("p", { className: "klein" }, "Opnames zijn netto en worden in je inkomen geteld. Rendement minus kosten wordt per maand bijgeschreven.")) : null);
}

/* ----- Lijfrente en pensioen ----- */
function SchermPensioen() {
  var c = useC(), m = c.m;
  var hy = hypOp(m, m.peil);
  return h("div", null,
    h(IntakeKnop, { menu: "pensioen" }),
    (!m.potten.length && !getal(m.hyp.bedrag)) ? h(LegeStaat, { menu: "pensioen", tekst: "Er zijn nog geen lijfrentes, pensioenpotten of hypotheek ingevuld." }) : null,
    m.profiel.gebruik.pensioen ? h(Kaart, { titel: "Lijfrente en pensioenpotten" }, h(PottenEditor, null)) : h(Kaart, { titel: "Lijfrente en pensioenpotten" }, h("p", { className: "klein" }, "Je hebt aangegeven geen potten te hebben."), h(Knop, { soort: "sec", klein: true, onClick: function () { c.zetPad("profiel", ["gebruik", "pensioen"], true); } }, "Toch potten invullen")),
    m.potten.length ? h(Kaart, { titel: "Netto-opbouw van het inkomen na de AOW" }, m.personen.map(function (p) {
      if (!p.aow) return h("p", { key: p.id, className: "klein" }, p.naam + ": geen AOW-datum bekend.");
      var d = plusMaanden(eerstVanMaand(p.aow), 1), pm = persoonMaand(m, p.id, d);
      return h("div", { key: p.id }, h("h4", null, p.naam + " vanaf " + fmtMaand(d)),
        h(Tabel, { kop: ["Bron", "Bruto", "Netto"], get: [1, 2], rijen: pm.lijst.map(function (x) { return [x.naam, eur(x.bruto), eur(x.netto)]; }).concat([{ klasse: "totaal", cellen: ["Totaal per maand", eur(pm.bruto), eur(pm.netto)] }]) }));
    }), h("p", { className: "klein" }, "Netto is een schatting met de fiscale tabel; zie Fiscaliteit & AOW voor de aannames.")) : null,
    m.profiel.gebruik.hypotheek ? h(Kaart, { titel: "Hypotheek" }, h(HypotheekForm, null),
      getal(m.hyp.bedrag) > 0 ? h(KV, { rijen: [["Maandlast nu", eur(hy.maandlast)], ["Openstaand over 5 jaar", eur(hypOp(m, plusJaren(m.peil, 5)).saldo)], ["Maandlast na einde aflossing", geldigeDatum(m.hyp.aflosEinde) ? eur(hypOp(m, plusMaanden(geldigeDatum(m.hyp.aflosEinde), 1)).maandlast) : "–"]] }) : null) : null);
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
