/* ===== Schermen: Vermogen, Grote posten en reserveringen, Fiscaliteit & AOW ===== */
var VM_REEKS = [
  { naam: "Spaargeld", kleur: "#0d9488", comp: ["sparen"] },
  { naam: "Deposito's", kleur: "#2563eb", comp: ["deposito"] },
  { naam: "Beleggingen", kleur: "#7c3aed", comp: ["beleggen"] },
  { naam: "Reserveringen", kleur: "#f59e0b", comp: ["reserv"] },
  { naam: "Pensioen en aanvulling", kleur: "#94a3b8", comp: ["pensioenbel", "pensioen", "aanvulling"] }
];
var COMP_NAAM = { sparen: "Spaargeld", deposito: "Deposito's", beleggen: "Beleggingen", pensioenbel: "Pensioenbeleggingen", pensioen: "Pensioen en lijfrente", aanvulling: "Inkomensaanvulling", reserv: "Reserveringen", overig: "Overige bezittingen", uitstaand: "Uitgeleend aan anderen", schuld: "Schulden", hypotheek: "Hypotheek" };
function LinkKnop(p) { return h("button", { type: "button", className: "linkknop", onClick: p.onClick, "data-klik": p.naam, title: "Toon waardoor dit verandert" }, p.children); }

// Wat veranderde er tussen maand i-1 en i? Per post, met naam.
function uitvalRijen(c, i, comp) {
  var vr = c.vr, nu = vr[i], vorig = vr[i - 1], rijen = [];
  function vindt(items, key) { return items.filter(function (x) { return x.key === key; })[0]; }
  if (comp === "sparen") {
    var groep = {};
    (nu.events || []).forEach(function (e) { groep[e.label] = (groep[e.label] || 0) + e.delta; });
    Object.keys(groep).forEach(function (k) { if (Math.abs(groep[k]) >= 0.5) rijen.push({ label: k, bedrag: groep[k] }); });
  } else {
    nu.items.forEach(function (it) {
      var behoort = comp === "vrij" ? ["sparen", "deposito", "beleggen", "reserv"].indexOf(it.comp) >= 0 : (comp === "totaal" ? true : it.comp === comp);
      if (!behoort) return;
      var v = vindt(vorig.items, it.key), d = it.waarde - (v ? v.waarde : 0);
      if (Math.abs(d) < 0.5) return;
      var label;
      if (it.comp === "deposito") label = (v && v.waarde > 0 && it.waarde === 0) ? "Vrijval deposito " + it.naam + " (naar spaargeld)" : (!v || v.waarde === 0) ? "Deposito " + it.naam + " gestart" : "Deposito " + it.naam;
      else if (it.comp === "beleggen" || it.comp === "pensioenbel") label = "Rendement " + it.naam;
      else if (it.comp === "reserv") label = "Reservering " + it.naam + (d > 0 ? ": gestort" : ": opgenomen");
      else if (it.comp === "sparen") label = "Spaarrekening (zie mutaties bij Spaargeld)";
      else if (it.comp === "pensioen") label = "Pensioenpot " + it.naam + (d > 0 ? ": groei" : ": uitkering en rendement");
      else if (it.comp === "aanvulling") label = it.naam + (d > 0 ? ": groei of storting" : ": opname");
      else if (it.comp === "hypotheek") label = "Hypotheek: aflossing";
      else label = it.naam;
      rijen.push({ label: label, bedrag: d });
    });
  }
  rijen.sort(function (a, b) { return Math.abs(b.bedrag) - Math.abs(a.bedrag); });
  return rijen;
}
function UitvalModal(p) {
  var c = useC(), i = p.i, comp = p.comp;
  var nu = c.vr[i], vorig = c.vr[i - 1];
  var rijen = uitvalRijen(c, i, comp);
  var top = rijen.slice(0, 8), rest = rijen.slice(8);
  var stand = function (r) { return comp === "sparen" ? r.spaar : comp === "vrij" ? r.t.vrij : comp === "totaal" ? r.t.totaal : r.t[comp]; };
  var verschil = stand(nu) - stand(vorig);
  var som = rijen.reduce(function (s, x) { return s + x.bedrag; }, 0);
  var tabel = top.map(function (r) { return [r.label, h("span", { className: r.bedrag < 0 ? "rood" : "groen" }, (r.bedrag > 0 ? "+" : "") + eur(r.bedrag))]; });
  if (rest.length) tabel.push(["Overige (" + rest.length + " posten)", eur(rest.reduce(function (s, x) { return s + x.bedrag; }, 0))]);
  if (Math.abs(verschil - som) >= 1) tabel.push(["Afronding en overig", eur(verschil - som)]);
  return h(Modal, { titel: (comp === "vrij" ? "Vrij vermogen" : comp === "totaal" ? "Totaal vermogen" : COMP_NAAM[comp]) + ", " + fmtMaand(nu.d), sluit: p.sluit },
    h(KV, { rijen: [["Stand einde " + fmtMaand(vorig.d), eur(stand(vorig))], ["Stand einde " + fmtMaand(nu.d), eur(stand(nu))], ["Verschil", (verschil > 0 ? "+" : "") + eur(verschil), true]] }),
    h("h4", { style: { marginTop: ".7rem" } }, "Belangrijkste mutaties"),
    tabel.length ? h(Tabel, { kop: ["Post", "Bedrag"], get: [1], rijen: tabel }) : h("p", { className: "klein" }, "Geen mutaties in deze periode."));
}

function PeildatumVermogen() {
  var c = useC(), m = c.m;
  var s = useState(""), datum = s[0], setDatum = s[1];
  var d = geldigeDatum(datum);
  var res = useMemo(function () {
    if (!d || d <= m.peil) return null;
    var mnd = Math.min(600, maandenTussen(m.peil, d) + 2);
    var sim2 = maakSim(m, mnd, d);
    if (!sim2.extra) return null;
    var items = vermogenItems(m, d, sim2.extra.spaar, sim2.extra.res);
    return { t: vermogenTotalen(items), items: items };
  }, [datum, m]);
  var t0 = c.vr[0].t;
  return h(Kaart, { titel: "Vermogen op een andere datum" },
    h(DatumVeld, { label: "Datum in de toekomst", hint: "Alleen datums na de peildatum (" + fmtDatum(m.peil) + "). Het verleden kent de app niet.", value: datum, onChange: setDatum, naam: "peil-andere" }),
    datum && !d ? h("p", { className: "rood klein" }, "Deze datum is niet geldig.") : null,
    d && d <= m.peil ? h("p", { className: "oranje klein" }, "Kies een datum na de peildatum.") : null,
    res ? h(Tabel, { kop: ["", "Op " + fmtDatum(d), "Nu", "Verschil"], get: [1, 2, 3], rijen: [
      ["Spaargeld", eur(res.t.sparen), eur(t0.sparen), eur(res.t.sparen - t0.sparen)],
      ["Deposito's", eur(res.t.deposito), eur(t0.deposito), eur(res.t.deposito - t0.deposito)],
      ["Beleggingen", eur(res.t.beleggen), eur(t0.beleggen), eur(res.t.beleggen - t0.beleggen)],
      ["Reserveringen", eur(res.t.reserv), eur(t0.reserv), eur(res.t.reserv - t0.reserv)],
      { klasse: "totaal", cellen: ["Vrij vermogen", eur(res.t.vrij), eur(t0.vrij), eur(res.t.vrij - t0.vrij)] },
      ["Totaal vermogen", eur(res.t.totaal), eur(t0.totaal), eur(res.t.totaal - t0.totaal)]
    ] }) : null);
}

function SchermVermogen() {
  var c = useC(), m = c.m, t = c.vr[0].t;
  var s = useState(null), uitval = s[0], setUitval = s[1];
  var snel = snelBeschikbaar(m, t.sparen, m.peil);
  var punten = c.vr.slice(0, 25);
  var heeft = heeftGegevens(m, "vermogen");
  function cel(i, comp, waarde) { return i === 0 ? eur(waarde) : h(LinkKnop, { naam: comp + i, onClick: function () { setUitval({ i: i, comp: comp }); } }, eur(waarde)); }
  return h("div", null,
    h(IntakeKnop, { menu: "vermogen" }),
    !heeft ? h(LegeStaat, { menu: "vermogen", tekst: "Er is nog geen vermogen ingevuld. Start de intake voor spaargeld, deposito's en beleggingen." }) : null,
    heeft ? h(Kaart, { titel: "Overzicht op " + fmtDatum(m.peil) },
      h(KV, { rijen: [
        ["Spaargeld, direct opneembaar", eur(t.sparen)],
        ["Binnen " + (getal(m.inst.kortMaanden) || 3) + " maanden beschikbaar", eur(snel.totaal)],
        ["Deposito's", eur(t.deposito)], ["Beleggingen (vrij)", eur(t.beleggen)], ["Reserveringen", eur(t.reserv)],
        ["Vrij vermogen", eur(t.vrij), true],
        ["Pensioen, lijfrente en aanvulling", eur(t.gebonden)], ["Overige bezittingen", eur(t.overig)], ["Uitgeleend aan anderen (vreemd vermogen)", eur(t.uitstaand)],
        ["Schulden", eur(t.schuld)], ["Hypotheek", eur(t.hypotheek)], ["Totaal vermogen", eur(t.totaal), true]] }),
      snel.lijst.length ? h("p", { className: "klein" }, "Snel beschikbaar bevat: " + snel.lijst.map(function (x) { return x.naam + " (" + fmtDatum(x.eind) + ", " + eur(x.bedrag) + ")"; }).join("; ") + ".") : null) : null,
    h(Kaart, { titel: "Spaargeld en rente" }, h(SpaarVeld, null), h(MinimumVeld, null), m.profiel.gebruik.deposito ? h(SnelBeschikbaarVelden, null) : null),
    m.profiel.gebruik.deposito ? h(Kaart, { titel: "Deposito's" }, h(DepositoEditor, null)) : null,
    m.profiel.gebruik.beleggen ? h(Kaart, { titel: "Beleggingen" }, h(BeleggingenEditor, null)) : null,
    h(Kaart, { titel: "Overige bezittingen" }, h(OverigEditor, null)),
    h(Kaart, { titel: "Schulden en uitstaande leningen" }, h(SchuldenEditor, null)),
    m.profiel.gebruik.beleggen ? h(Kaart, { titel: "Aannames voor de prognose" },
      h("div", { className: "raster" },
        h(BedragVeld, { label: "Rendement beleggingen per jaar (%)", value: m.inst.rendBeleggen, pct: true, onChange: function (v) { c.zet("inst", { rendBeleggen: v }); }, naam: "rendBeleggen" }),
        h(BedragVeld, { label: "Rendement pensioenbeleggingen per jaar (%)", value: m.inst.rendPot, pct: true, onChange: function (v) { c.zet("inst", { rendPot: v }); } })),
      h(Uitleg, null, "Dit is een rekenaanname voor de toekomst, geen belofte. De rente van een deposito blijft de rente die je bij het deposito hebt ingevuld.")) : null,
    h(UitbreidenKaart, null),
    heeft ? h(Kaart, { titel: "Prognose komende 24 maanden (in duizenden euro's)" },
      h(Staafgrafiek, { reeksen: VM_REEKS, punten: punten.map(function (r) { return { label: fmtMaandKort(r.d), waarden: VM_REEKS.map(function (s) { return s.comp.reduce(function (a, k) { return a + r.t[k]; }, 0); }) }; }), onKlik: function (i) { if (i > 0) setUitval({ i: i, comp: "vrij" }); }, titel: "Vermogen per maand" }),
      h(Legenda, { reeksen: VM_REEKS }),
      h("div", { style: { marginTop: ".5rem" } }, h(Tabel, { kop: ["Einde maand", "Spaargeld", "Deposito's", "Belegd", "Vrij vermogen"], get: [1, 2, 3, 4], rijen: punten.map(function (r, i) {
        return [fmtMaandKort(r.d), cel(i, "sparen", r.t.sparen), cel(i, "deposito", r.t.deposito), cel(i, "beleggen", r.t.beleggen), cel(i, "vrij", r.t.vrij)];
      }) })),
      h(Uitleg, null, "Tik op een bedrag om te zien waardoor het verandert ten opzichte van de maand ervoor.")) : null,
    heeft ? h(PeildatumVermogen, null) : null,
    uitval ? h(UitvalModal, { i: uitval.i, comp: uitval.comp, sluit: function () { setUitval(null); } }) : null);
}

/* ----- Grote posten en reserveringen ----- */
function alleEvents(sim) { var u = []; sim.maand.forEach(function (r) { (r.events || []).forEach(function (e) { u.push(e); }); }); return u; }
var SOORT_LABEL = { inkomen: "Netto inkomen", aanvulling: "Opname inkomensaanvulling", vast: "Vaste lasten", dagelijks: "Dagelijkse uitgaven", hypotheek: "Hypotheek", reservering: "Reserveringen (gestort)", spaarrente: "Rente spaarrekening", boeking: "Geplande grote posten", depoRente: "Rente deposito's", depoVrijval: "Vrijval deposito's", depoStart: "Nieuwe deposito's (van spaarrekening)", aanvulmutatie: "Stortingen en opnames inkomensaanvulling" };
function SchermGrote() {
  var c = useC(), m = c.m, sim = c.sim, min = getal(m.grote.minimum);
  var heeft = heeftGegevens(m, "grote") || getal(m.verm.spaar) > 0;
  var rijen = c.vr.slice(0, 25).map(function (r, i) {
    var st = r.min < 0 ? ["fout", "Onder nul"] : r.min < min ? ["waarschuw", "Onder minimum"] : ["goed", "Genoeg"];
    return [i === 0 ? "Nu" : fmtMaand(r.d), eur(r.min), h("span", { className: r.min - min < 0 ? "rood" : "" }, eur(r.min - min)), h("span", { className: "badge " + st[0] }, st[1])];
  });
  var ev = alleEvents(sim), jaar0 = m.peil.getFullYear();
  var jaren = []; for (var j = jaar0; j <= jaar0 + 4; j++) jaren.push(j);
  var perSoort = {};
  ev.forEach(function (e) { var k = e.soort; perSoort[k] = perSoort[k] || {}; perSoort[k][e.d.getFullYear()] = (perSoort[k][e.d.getFullYear()] || 0) + e.delta; });
  var soortRijen = Object.keys(perSoort).map(function (k) { return [SOORT_LABEL[k] || k].concat(jaren.map(function (y) { return eur(perSoort[k][y] || 0); })); });
  var boekingRijen = (m.grote.boekingen || []).map(function (b) {
    var naam = b.omschrijving || "zonder omschrijving";
    var per = {}; ev.forEach(function (e) { if (e.soort === "boeking" && e.label.indexOf(naam) === 0) per[e.d.getFullYear()] = (per[e.d.getFullYear()] || 0) + (e.resDelta != null && e.delta === 0 ? e.resDelta : e.delta); });
    return [naam].concat(jaren.map(function (y) { return per[y] ? eur(per[y]) : "–"; }));
  });
  var resRijen = (m.grote.reserveringen || []).map(function (r) {
    var laatste = c.vr[Math.min(12, c.vr.length - 1)].items.filter(function (x) { return x.key === "res" + r.id; })[0];
    return [r.naam || "Reservering", eur(getal(r.startsaldo)), eur(laatste ? laatste.waarde : 0)];
  });
  var renteJaren = Object.keys(sim.renteJaar);
  return h("div", null,
    h(IntakeKnop, { menu: "grote" }),
    !heeft ? h(LegeStaat, { menu: "grote", tekst: "Vul eerst je spaargeld in bij Vermogen en daarna je reserveringen en geplande grote posten." }) : null,
    h(Kaart, { titel: "Minimale buffer" }, h(MinimumVeld, null), h(Uitleg, null, "Startsaldo: het spaargeld van het menu Vermogen (" + eur(m.verm.spaar) + ").")),
    getal(m.verm.spaar) > 0 || (m.verm.deposito || []).length ? h(Kaart, { titel: "Heb ik genoeg geld?" },
      h("p", { className: "klein" }, "Het laagste spaargeld in elke maand, vergeleken met je minimum van " + eur(min) + ". Gerekend over de dagen van de maand."),
      h(Tabel, { kop: ["Maand", "Laagste punt", "Boven/onder minimum", "Status"], get: [1, 2], rijen: rijen })) : null,
    h(Kaart, { titel: "Reserveringen" }, h(ReserveringenEditor, null),
      resRijen.length ? h("div", null, h("h4", null, "Saldo van de potten"), h(Tabel, { kop: ["Pot", "Nu", "Over 12 maanden"], get: [1, 2], rijen: resRijen })) : null),
    h(Kaart, { titel: "Geplande grote inkomsten en uitgaven" }, h(BoekingenEditor, null)),
    boekingRijen.length ? h(Kaart, { titel: "Verloop per boeking over vijf jaar" }, h(Tabel, { kop: ["Boeking"].concat(jaren.map(String)), get: jaren.map(function (_, i) { return i + 1; }), rijen: boekingRijen })) : null,
    renteJaren.length ? h(Kaart, { titel: "Rente op de spaarrekening per jaar" },
      h("p", { className: "klein" }, "De rente wordt berekend per dag en op 31 december bijgeschreven. Staat je bank een ander bedrag toe, vul dan hieronder het vaste bedrag in."),
      renteJaren.slice(0, 5).map(function (j) {
        var o = (m.grote.renteOverride || {})[j];
        return h("div", { key: j, className: "raster" },
          h(Veld, { label: "Rente " + j + " (nu gebruikt: " + eur(sim.renteJaar[j]) + ")" }, h(NumInput, { value: o === undefined ? "" : o, placeholder: "berekend", onChange: function (v) { c.zetPad("grote", ["renteOverride", String(j)], v === "" ? undefined : v); } })));
      })) : null,
    soortRijen.length ? h(Kaart, { titel: "Jaaroverzicht spaarrekening" }, h(Tabel, { kop: ["Post"].concat(jaren.map(String)), get: jaren.map(function (_, i) { return i + 1; }), rijen: soortRijen }),
      h(Uitleg, null, "Saldo = inkomsten van de personen − vaste lasten − dagelijkse uitgaven (maandelijks), plus alle overige boekingen. Reserveringen tellen als last. Het eerste jaar loopt vanaf de peildatum.")) : null);
}

/* ----- Fiscaliteit & AOW ----- */
function FiscaalSamenvatting() {
  var c = useC(), m = c.m, jaar = m.peil.getFullYear(), T = fiscaalTabel(m);
  var f = fiscaalJaar(m, jaar);
  var rijen = [
    ["Jaar", String(jaar)], ["Status van de cijfers", f._geindexeerd ? "Geschat (indexatie na " + T.laatste + ")" : f._status], ["Bron", f._bron || "Belastingdienst, SVB"],
    ["Stand van de tabel", fmtDatum(T.stand)],
    ["Belasting eerste schijf voor / vanaf AOW", pct(f.tarief1, 2) + " / " + pct(f.tarief1_aow, 2)], ["Einde eerste schijf", eur(f.schijf1_max)],
    ["Algemene heffingskorting, maximaal", eur(f.algemene_heffingskorting_max)],
    ["AOW bruto per maand" + (m.profiel.partner && m.profiel.fiscalePartners !== false ? " (per persoon, met partner)" : " (alleenstaand)"), eur(aowBrutoMaand(m, m.peil))]
  ];
  var w = fiscaalWaarschuwingen(m, m.nu);
  return h("div", null, h(KV, { rijen: rijen }), w.map(function (t, i) { return h("p", { key: i, className: "oranje klein" }, t); }));
}
function Box3Velden() {
  var c = useC(), b = c.S.box3, f = fx(c.m, c.m.peil);
  function z(patch) { c.zet("box3", patch); }
  return h("div", null,
    h(KeuzeVeld, { label: "Stelsel", hint: "Het huidige stelsel rekent met een fictief rendement. Werkelijk rendement is beoogd vanaf 2028 en nog onzeker.", value: b.stelsel, opties: [["huidig", "Huidig stelsel (fictief rendement)"], ["werkelijk", "Werkelijk rendement (indicatief)"]], onChange: function (v) { z({ stelsel: v }); }, naam: "box3-stelsel" }),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Tarief (%)", hint: "Standaard " + pct(f.box3_tarief, 0), value: b.tarief, pct: true, onChange: function (v) { z({ tarief: v }); } }),
      h(BedragVeld, { label: "Heffingsvrij vermogen per persoon", hint: "Standaard " + eur(f.box3_vrij_pp), value: b.vrijPP, onChange: function (v) { z({ vrijPP: v }); } })),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Fictief rendement sparen (%)", hint: "Standaard " + pct(f.box3_sparen_pct, 2), value: b.sparenPct, pct: true, onChange: function (v) { z({ sparenPct: v }); } }),
      h(BedragVeld, { label: "Fictief rendement beleggen (%)", hint: "Standaard " + pct(f.box3_beleggen_pct, 2), value: b.beleggenPct, pct: true, onChange: function (v) { z({ beleggenPct: v }); } })));
}
function FiscaalOverrides() {
  var c = useC(), m = c.m, T = fiscaalTabel(m);
  var s = useState(String(T.laatste)), jaar = s[0], setJaar = s[1];
  var o = (c.S.fiscOverride || {})[jaar] || {}, basis = T.perJaar[jaar].w;
  var velden = Object.keys(FISCAAL_LABELS);
  return h("div", null,
    h(KeuzeVeld, { label: "Jaar", value: jaar, opties: T.jaren.map(function (j) { return [String(j), String(j) + " (" + T.perJaar[j].status + ")"]; }), onChange: setJaar }),
    h(Uitleg, null, "Leeg laten = de standaardwaarde van de app. Vul alleen in als je zeker weet dat de app afwijkt."),
    h("div", { className: "raster" }, velden.map(function (k) {
      var lab = FISCAAL_LABELS[k];
      return h(Veld, { key: k, label: lab[0], hint: "Standaard " + (lab[1] === "p" ? pct(basis[k], 2) : eur(basis[k])) },
        h(NumInput, { value: o[k] === undefined ? "" : o[k], pct: lab[1] === "p", onChange: function (v) { c.zetPad("fiscOverride", [jaar, k], v === "" ? undefined : v); } }));
    })),
    h(Knop, { soort: "gevaar", klein: true, onClick: function () { c.zetPad("fiscOverride", [jaar], undefined); }, naam: "fiscaal-reset" }, "Terug naar standaardwaarden voor " + jaar));
}
function SchermFiscaal() {
  var c = useC(), m = c.m, t = c.vr[0].t, items = c.vr[0].items, T = fiscaalTabel(m);
  var bank = t.sparen + t.deposito + t.reserv, beleg = t.beleggen;
  var overig = items.filter(function (x) { return x.comp === "overig" && x.box3; }).reduce(function (s, x) { return s + x.waarde; }, 0);
  var schuld = -t.schuld;
  var b3 = box3Indicatie(m, bank, beleg, overig, schuld, m.peil);
  var jaar = m.peil.getFullYear();
  var tabelRijen = [];
  [jaar, jaar + 1].forEach(function (j) {
    var fj = fiscaalJaar(m, j);
    tabelRijen.push([String(j) + (fj._geindexeerd ? " (geschat)" : " (" + fj._status + ")"), pct(fj.tarief1, 2) + " / " + pct(fj.tarief1_aow, 2), eur(fj.schijf1_max) + " / " + eur(fj.schijf2_max), eur(fj.algemene_heffingskorting_max), eur(aowBrutoMaand(m, new Date(j, 6, 1)))]);
  });
  return h("div", null,
    h(Kaart, { titel: "Cijfers actueel houden" }, h("p", null, "Je hoeft hier niets in te vullen. Druk periodiek (elke maand) op de knop: de app haalt dan de nieuwste belastingcijfers, AOW-bedragen, inflatie en rentes op."), h(CijfersKnop, null)),
    h(Kaart, { titel: "Controle fiscale tabel" }, h(FiscaalSamenvatting, null)),
    h(Kaart, { titel: "Tarieven en AOW" },
      h(Tabel, { kop: ["Jaar", "Tarief 1e schijf (voor / vanaf AOW)", "Schijfgrenzen", "Alg. heffingskorting", "AOW per maand bruto"], rijen: tabelRijen }),
      h("p", { className: "klein" }, "Tarieven en kortingen: Belastingdienst. AOW-bedragen: SVB (elk halfjaar). Jaren na " + T.laatste + " worden geschat met indexatie.")),
    h(Kaart, { titel: "Box 3 (indicatie)" },
      h(KV, { rijen: [["Banktegoeden (sparen, deposito's, reserveringen)", eur(bank)], ["Beleggingen en overige bezittingen", eur(beleg + overig)], ["Schulden", eur(schuld)], ["Heffingsvrij vermogen", eur(b3.vrij)],
        ["Rendement (" + (b3.werkelijk ? "werkelijk, indicatief" : "fictief") + ")", eur(b3.rendement)], ["Geschatte box 3-belasting per jaar", eur(b3.belasting), true]] }),
      h("p", { className: "klein" }, "Dit is een indicatie met vereenvoudigingen (geen schuldendrempel, geen groene beleggingen, geen verdeling tussen partners). Controleer je aangifte bij de Belastingdienst.")),
    h(Kaart, { titel: "Aannames en beperkingen" }, h("ul", { className: "lijst" },
      h("li", null, "Belasting wordt per persoon over box 1 berekend, met algemene heffingskorting, ouderenkorting, arbeidskorting en Zvw-bijdrage op pensioen."),
      h("li", null, "Hypotheekrenteaftrek en eigenwoningforfait zijn niet gemodelleerd; vul bij inkomen het netto in dat je werkelijk ontvangt."),
      h("li", null, "Arbeidskorting rekent alleen het afbouwtraject door: bij lagere inkomens is dit een bovengrens. Vul bij loon bij voorkeur zelf het netto in."),
      h("li", null, "AOW: alleenstaand 70% van het minimumloon, met partner 50% per persoon. Woon je samen met iemand die niet je partner is, dan verandert je AOW niet. De kostendelersnorm geldt wel voor AIO-aanvulling, Anw en bijstand; die zijn niet gemodelleerd. De AOW wordt per jaar geïndexeerd en telt vanaf de maand van de AOW-datum."),
      h("li", null, "Heffingskorting (algemene korting, arbeidskorting, ouderenkorting) wordt automatisch toegepast op het hoogste inkomen van elke persoon, op basis van leeftijd (AOW-leeftijd), arbeid (loon of winst) en de hoogte van het inkomen."),
      h("li", null, "Toeslagen en kinderbijslag tellen volledig mee als belastingvrij inkomen; de app berekent niet of je er recht op hebt."),
      h("li", null, "De AOW-leeftijd voor latere geboortejaren is verwacht, niet vastgesteld."),
      h("li", null, "De app geeft rekenvoorbeelden, geen persoonlijk fiscaal advies."))),
    h("details", null, h("summary", { className: "klein" }, "Geavanceerd (niet nodig voor gewoon gebruik)"),
      h("div", { className: "kaart waarschuw", style: { marginTop: ".4rem" } }, h("p", null, "Hier wijzig je de rekenregels. Doe dat alleen als je weet wat je doet; 'Cijfers bijwerken' overschrijft de tabel niet met jouw aanpassingen."),
        h("div", { className: "raster" },
          h(BedragVeld, { label: "Indexatie schijven en kortingen per jaar (%)", value: m.inst.indexSchijven, pct: true, onChange: function (v) { c.zet("inst", { indexSchijven: v }); } }),
          h(BedragVeld, { label: "Indexatie AOW per jaar (%)", value: m.inst.indexAOW, pct: true, onChange: function (v) { c.zet("inst", { indexAOW: v }); } })),
        h(Box3Velden, null), h("h4", null, "Afwijkende fiscale waarden"), h(FiscaalOverrides, null))),
    h("p", { className: "klein" }, "Bronnen: Belastingdienst (belastingdienst.nl), SVB (svb.nl), CBS (cbs.nl), Rijksoverheid (rijksoverheid.nl)."));
}
