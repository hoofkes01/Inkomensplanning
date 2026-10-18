/* ===== Gedeelde context, lijst-editor, intake-raamwerk, aandachtspunten ===== */
var Ctx = React.createContext(null);
function useC() { return useContext(Ctx); }

function LijstEditor(p) {
  return h("div", null,
    p.items.length === 0 ? h("p", { className: "klein" }, p.leeg || "Nog niets toegevoegd.") : null,
    p.items.map(function (it, i) {
      return h("div", { key: it.id, className: "kaart", style: { background: "#f8fafc" }, "data-item": p.naam },
        h("div", { className: "rij tussen", style: { marginBottom: ".4rem" } },
          h("b", null, p.kop(it, i)),
          h(Knop, { soort: "gevaar", klein: true, onClick: function () { if (window.confirm("Weet je zeker dat je dit wilt verwijderen?")) p.onWis(it.id); } }, "Verwijder")),
        p.velden(it, function (patch) { p.onWijzig(it.id, patch); }));
    }),
    h(Knop, { soort: "sec", onClick: p.onVoeg, naam: "voeg-" + (p.naam || "toe") }, "+ " + (p.voegTekst || "Toevoegen")));
}
function Uitleg(p) { return h("p", { className: "klein" }, p.children); }

/* ---------- Aandachtspunten voor het Dashboard ---------- */
function intakeMenus(profiel) { return actieveMenus(profiel).filter(function (x) { return x.intake; }); }
function intakeKlaarAantal(S) { return intakeMenus(S.profiel).filter(function (x) { return (S.intake[x.id] || {}).klaar; }).length; }
// Controle op toeslagen met grenzen van de Belastingdienst: toetsingsinkomen en vermogen. Geen berekening van het bedrag zelf.
function toeslagWaarschuwingen(c) {
  var m = c.m, S = c.S, uit = [];
  var heeft = function (code) { return S.bronnen.some(function (b) { return b.code === code; }); };
  var zorg = heeft("zorgtoeslag"), kgb = heeft("kgb"), huur = heeft("huurtoeslag");
  if (!zorg && !kgb && !huur) return uit;
  var f = fx(m, m.peil), partners = m.profiel.partner && m.profiel.fiscalePartners !== false;
  var items = c.vr[0].items, t = c.vr[0].t;
  var bank = t.sparen + t.deposito + t.reserv, overig = items.filter(function (x) { return x.comp === "overig" && x.box3; }).reduce(function (s, x) { return s + x.waarde; }, 0);
  var vermogen = box3Indicatie(m, bank, t.beleggen, overig, -t.schuld, m.peil).totaal;
  var gV = getal(partners ? f.toeslag_vermogen_partner : f.toeslag_vermogen_alleen);
  if ((zorg || kgb) && vermogen > gV) uit.push("Je vermogen (circa " + eur(vermogen) + ") ligt boven de grens van " + eur(gV) + " voor " + [zorg ? "zorgtoeslag" : "", kgb ? "kindgebonden budget" : ""].filter(function (x) { return x; }).join(" en ") + ". Je hebt dan waarschijnlijk geen recht meer. Het vermogen op 1 januari telt.");
  if (huur && !partners && vermogen > getal(f.toeslag_vermogen_huur_alleen)) uit.push("Je vermogen (circa " + eur(vermogen) + ") ligt boven de vermogensgrens voor huurtoeslag voor een alleenstaande (" + eur(f.toeslag_vermogen_huur_alleen) + "). Je hebt dan waarschijnlijk geen recht meer.");
  if (zorg) {
    var gI = getal(partners ? f.toeslag_inkomen_zorg_partner : f.toeslag_inkomen_zorg_alleen);
    var fasen = fasenLijst(m), eerste = fasen.filter(function (x) { var inkomen = x.personen.reduce(function (s, p) { return s + p.bruto; }, 0) * 12; return inkomen > gI; })[0];
    if (eerste) uit.push("In de fase '" + eerste.naam + "' (" + fmtMaand(eerste.d) + ") komt je bruto inkomen boven de inkomensgrens voor zorgtoeslag (" + eur(gI) + "). Daarna vervalt de zorgtoeslag waarschijnlijk. Haal hem dan uit je inkomen of zet er een einddatum bij.");
  }
  return uit;
}
function aandachtspunten(c) {
  var m = c.m, sim = c.sim, S = c.S, nu = m.nu, uit = [];
  function pt(soort, tekst, menu) { uit.push({ soort: soort, tekst: tekst, menu: menu }); }
  var tot = intakeMenus(S.profiel).length, klaar = intakeKlaarAantal(S);
  if (klaar < tot) pt("info", "Intake: " + klaar + " van " + tot + " menu's voltooid. Zonder intake kan de app niet alles berekenen.", "dashboard");
  if ((S.grote.minimum === "" || S.grote.minimum == null) && S.profiel.type) pt("waarschuw", "Geef je minimale buffer aan spaargeld aan (Vermogen). Daar rekent de app mee.", "vermogen");
  if (!S.profiel.geboorteA) pt("waarschuw", "Vul de geboortedatum in; zonder die kan de AOW-datum niet worden bepaald.", "dashboard");
  if (ouderDan(S.inst.cijfersDatum, 14, nu)) pt("waarschuw", "De cijfers (belasting, AOW, inflatie, rentes) zijn " + (S.inst.cijfersDatum ? "van " + fmtDatum(S.inst.cijfersDatum) : "nog nooit bijgewerkt") + ". Druk op 'Cijfers bijwerken'.", "dashboard");
  if (S.inst.cijfersFout) pt("fout", "Het bijwerken van de cijfers is op " + fmtDatum(S.inst.cijfersFout.datum) + " mislukt: " + S.inst.cijfersFout.tekst + " Je rekent nu met oudere cijfers. Probeer het opnieuw of kies een cijferbestand.", "dashboard");
  else if ((S.cijfers || {}).versie && dagenTussen(geldigeDatum(S.cijfers.versie), nu) > 45) pt("waarschuw", "Het cijferbestand is van " + fmtDatum(S.cijfers.versie) + ": er zijn nog geen nieuwere cijfers beschikbaar. Controleer of er een nieuwe versie van de app is.", "dashboard");
  toeslagWaarschuwingen(c).forEach(function (t) { pt("waarschuw", t, "inkomen"); });
  if (klaar >= 1) {
    var stale = actualiseerStappen(c).filter(function (x) { var l = actualiseerLeeftijd(c, x.id); return x.id !== "cijfers" && (l == null || l > (x.dagen || 31)); });
    if (stale.length) pt("info", "Actualiseren: " + stale.map(function (x) { return x.titel.toLowerCase(); }).slice(0, 4).join(", ") + (stale.length > 4 ? " en meer" : "") + " zijn niet recent bijgewerkt of nog niet gecontroleerd.", "dashboard");
  }
  if (S.profiel.gebruik.deposito) (S.verm.deposito || []).forEach(function (dep) {
    var pl = depositoPlan(m, dep); if (!pl) return;
    var dagen = dagenTussen(nu, pl.eind), nm = dep.bank || dep.naam || "zonder naam";
    if (dagen < 0) pt("fout", "Deposito '" + nm + "' is verlopen op " + fmtDatum(pl.eind) + ". Boek het bedrag zelf over en verwijder of werk het deposito bij.", "vermogen");
    else if (dagen <= 60) pt("waarschuw", "Deposito '" + nm + "' vervalt over " + dagen + " dagen (" + fmtDatum(pl.eind) + "). Beslis zelf of je een nieuw deposito afsluit vanaf de spaarrekening.", "vermogen");
  });
  if (m.profiel.gebruik.hypotheek && geldigeDatum(m.hyp.renteVastTot)) {
    var dg = dagenTussen(nu, geldigeDatum(m.hyp.renteVastTot));
    if (dg >= 0 && dg <= 365) pt("waarschuw", "De rentevaste periode van de hypotheek eindigt op " + fmtDatum(m.hyp.renteVastTot) + ".", "pensioen");
  }
  if (getal(m.verm.spaar) > 0 || (S.verm.deposito || []).length) {
    var min = getal(S.grote.minimum), lag = null;
    sim.maand.slice(0, 13).forEach(function (r) { if (r.min < min && (!lag || r.min < lag.min)) lag = r; });
    if (lag) pt("waarschuw", "Het spaargeld komt in de komende 12 maanden onder je minimum van " + eur(min) + " (laagste punt " + eur(lag.min) + " in " + fmtMaand(lag.d) + ").", "grote");
  }
  if (S.profiel.gebruik.beleggen) {
    var pfd = geldigeDatum((S.advies || {}).pfDatum);
    if ((S.advies.pf || []).length && (!pfd || dagenTussen(pfd, nu) > 30)) pt("waarschuw", "De portefeuille bij Beleggingsadvies is ouder dan een maand. Upload hem opnieuw.", "advies");
  }
  fiscaalWaarschuwingen(m, nu).forEach(function (t) { pt("info", t, "fiscaal"); });
  var bm = backupMeta();
  if ((S.bronnen.length || getal(m.verm.spaar)) && (!bm || dagenTussen(new Date(bm.tijd), nu) > 30)) pt("info", "Je hebt langer dan een maand geen back-up gemaakt. Tik linksonder op de balk om je gegevens op te slaan.", "dashboard");
  return uit;
}

/* ---------- Intake ---------- */
// INTAKE[menu] = { titel, stappen: [{ id, titel, uitleg, overslaan, render(c), valideer(c) }] }
var INTAKE = {};
function intakeStatus(c, menu) { return c.S.intake[menu] || {}; }
function IntakeModal(p) {
  var c = useC(), menu = p.menu, def0 = INTAKE[menu];
  var st = intakeStatus(c, menu);
  var lijstS = typeof def0.stappen === "function" ? def0.stappen(c) : def0.stappen;
  var def = { titel: def0.titel, stappen: lijstS };
  var s0 = useState(Math.max(0, Math.min(st.stap || 0, def.stappen.length - 1))), stap = s0[0], setStap = s0[1];
  var s1 = useState([]), fouten = s1[0], setFouten = s1[1];
  var stapDef = def.stappen[stap];
  useEffect(function () { if (!def.stappen.length) { c.zetPad("intake", [menu], { gezien: true, klaar: true, stap: 0, overgeslagen: [] }); p.sluit(); } }, []);
  if (!stapDef) return null;
  function bewaar(patch) { c.zetPad("intake", [menu], Object.assign({}, intakeStatus(c, menu), { gezien: true }, patch)); }
  function ga(naar, overgeslagen) {
    var ov = (st.overgeslagen || []).filter(function (x) { return x !== stapDef.id; });
    if (overgeslagen) ov.push(stapDef.id);
    if (naar >= def.stappen.length) { bewaar({ klaar: true, stap: 0, overgeslagen: ov }); p.sluit(); return; }
    bewaar({ stap: naar, overgeslagen: ov });
    setStap(naar); setFouten([]);
  }
  function volgende() {
    var f = stapDef.valideer ? stapDef.valideer(c) : [];
    if (f.length) { setFouten(f); return; }
    ga(stap + 1, false);
  }
  return h(Modal, { titel: "Intake: " + def.titel, sluit: function () { bewaar({ stap: stap }); p.sluit(); } },
    h("p", { className: "klein" }, "Stap " + (stap + 1) + " van " + def.stappen.length + ". Je antwoorden worden direct bewaard. Je kunt later verder."),
    h("div", { className: "stappen" }, def.stappen.map(function (x, i) { return h("i", { key: x.id, className: i <= stap ? "klaar" : "" }); })),
    h("h3", null, stapDef.titel),
    stapDef.uitleg ? h("p", { className: "klein" }, stapDef.uitleg) : null,
    h("div", { "data-intake-stap": stapDef.id }, stapDef.render(c)),
    fouten.length ? h("div", { className: "kaart fout", role: "alert" }, h("b", null, "Controleer dit nog:"), h("ul", { className: "lijst" }, fouten.map(function (f, i) { return h("li", { key: i }, f); }))) : null,
    h("div", { className: "rij tussen", style: { marginTop: ".6rem" } },
      h(Knop, { soort: "sec", disabled: stap === 0, onClick: function () { setStap(stap - 1); setFouten([]); bewaar({ stap: stap - 1 }); }, naam: "intake-terug" }, "Terug"),
      h("div", { className: "rij" },
        stapDef.overslaan ? h(Knop, { soort: "sec", onClick: function () { ga(stap + 1, true); }, naam: "intake-overslaan" }, "Overslaan") : null,
        h(Knop, { onClick: volgende, naam: "intake-volgende" }, stap === def.stappen.length - 1 ? "Klaar" : "Volgende"))),
    stapDef.overslaan ? h("p", { className: "klein" }, "Overslaan: " + stapDef.overslaan) : null);
}
function LegeStaat(p) {
  var c = useC();
  return h("div", { className: "kaart leeg", "data-leeg": p.menu },
    h("h2", null, p.titel || "Nog niets ingevuld"),
    h("p", null, p.tekst),
    h(Knop, { onClick: function () { c.openIntake(p.menu); }, naam: "intake-starten" }, "Intake starten"));
}
function IntakeKnop(p) {
  var c = useC(), st = intakeStatus(c, p.menu);
  if (!INTAKE[p.menu]) return null;
  return h("div", { className: "rij tussen noprint", style: { marginBottom: ".6rem" } },
    h("span", { className: "klein" }, st.klaar ? "Intake voltooid" + ((st.overgeslagen || []).length ? " (met " + st.overgeslagen.length + " overgeslagen onderdeel/onderdelen)" : "") : "Intake nog niet voltooid"),
    h(Knop, { soort: "sec", klein: true, onClick: function () { c.openIntake(p.menu); }, naam: "intake-opnieuw" }, st.klaar ? "Intake opnieuw" : "Intake starten"));
}
