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
function aandachtspunten(c) {
  var m = c.m, sim = c.sim, S = c.S, nu = m.nu, uit = [];
  function pt(soort, tekst, menu) { uit.push({ soort: soort, tekst: tekst, menu: menu }); }
  var tot = intakeMenus(S.profiel).length, klaar = intakeKlaarAantal(S);
  if (klaar < tot) pt("info", "Intake: " + klaar + " van " + tot + " menu's voltooid. Zonder intake kan de app niet alles berekenen.", "dashboard");
  if ((S.grote.minimum === "" || S.grote.minimum == null) && S.profiel.type) pt("waarschuw", "Geef je minimale buffer aan spaargeld aan (Vermogen). Daar rekent de app mee.", "vermogen");
  if (!S.profiel.geboorteA) pt("waarschuw", "Vul de geboortedatum in; zonder die kan de AOW-datum niet worden bepaald.", "dashboard");
  if (ouderDan(S.inst.cijfersDatum, 14, nu)) pt("waarschuw", "De cijfers (belasting, AOW, inflatie, rentes) zijn " + (S.inst.cijfersDatum ? "van " + fmtDatum(S.inst.cijfersDatum) : "nog nooit bijgewerkt") + ". Druk op 'Cijfers bijwerken'.", "dashboard");
  if (klaar >= 1) {
    var stale = actualiseerStappen(c).filter(function (x) { var l = actualiseerLeeftijd(c, x.id); return x.id !== "cijfers" && (l == null || l > 31); });
    if (stale.length) pt("info", "Actualiseren: " + stale.map(function (x) { return x.titel.toLowerCase(); }).slice(0, 4).join(", ") + (stale.length > 4 ? " en meer" : "") + " zijn langer dan een maand niet bijgewerkt of nog niet gecontroleerd.", "dashboard");
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
