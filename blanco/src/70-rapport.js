/* ===== Rapport (PDF via afdrukken) ===== */
var RAPPORT_ONDERDELEN = [
  ["watvalt", "Wat valt op"], ["kansen", "Kansen: wat kan het opleveren?"], ["aanbiedingen", "Nieuwe aanbiedingen en besparing"], ["kalender", "Jaarkalender"], ["prognose", "Vermogensprognose"], ["vermogenverandering", "Waardoor verandert het vermogen?"], ["spaarverandering", "Waardoor verandert het spaargeld?"],
  ["mutaties", "Belangrijkste mutaties, komende 12 maanden"], ["genoeg", "Heb ik genoeg spaargeld?"], ["deposito", "Deposito's"], ["depositorente", "Rente van deposito's per jaar"],
  ["beleggen", "Beleggen en pensioen"], ["advies", "Beleggingsadvies"], ["fases", "Inkomen per fase"], ["lasten", "Vaste lasten en dagelijkse uitgaven"],
  ["grote", "Grote inkomsten en uitgaven"], ["auto", "Automatische boekingen op het spaargeld"], ["aannames", "Aannames en controles"], ["toelichting", "Toelichting"]
];
function RapportKeuzes() {
  var c = useC(), o = c.S.rapport.onderdelen || {};
  return h("div", null,
    RAPPORT_ONDERDELEN.map(function (x) {
      if (x[0] === "advies") return null;
      return h(Vink, { key: x[0], label: x[1], value: o[x[0]] !== false, onChange: function (v) { c.zetPad("rapport", ["onderdelen", x[0]], v); } });
    }),
    h(Vink, { label: "Beleggingsadvies opnemen", value: c.S.rapport.advies !== false && (c.S.rapport.onderdelen || {}).advies !== false, onChange: function (v) { c.zet("rapport", { advies: v }); c.zetPad("rapport", ["onderdelen", "advies"], v); } }));
}
function RpSectie(p) {
  return h("section", { className: "rp-sectie", "data-rp": p.id }, h("h2", null, p.titel), p.children);
}
function rpAan(c, id) { var o = c.S.rapport.onderdelen || {}; return o[id] !== false && !(id === "advies" && c.S.rapport.advies === false); }

function RapportInhoud() {
  var c = useC(), m = c.m, sim = c.sim, vr = c.vr, t0 = vr[0].t, S = c.S;
  var ev = alleEvents(sim), jaar0 = m.peil.getFullYear();
  var A = useMemo(function () { try { return adviesBerekening(m, sim); } catch (e) { return null; } }, [m, sim]);
  var fasen = useMemo(function () { return fasenLijst(m); }, [m]);
  var punten = aandachtspunten(c);
  var min = getal(S.grote.minimum);
  var j12 = Math.min(12, vr.length - 1);
  var pagina = 0;
  function secties(lijst) {
    var els = lijst.filter(function (x) { return x; });
    if (!els.length) return null;
    var cls = "rp-pagina" + (pagina++ > 0 ? " rp-nieuwepagina" : "");
    return h("div", { className: cls }, els);
  }
  var out = [];

  // Pagina 1
  out.push(secties([
    rpAan(c, "watvalt") ? h(RpSectie, { key: "watvalt", id: "watvalt", titel: "Wat valt op" },
      h(KV, { rijen: [["Spaargeld, direct opneembaar", eur(t0.sparen)], ["Vrij vermogen", eur(t0.vrij)], ["Totaal vermogen", eur(t0.totaal)], ["Laagste spaargeld komende 12 maanden", eur(Math.min.apply(null, sim.maand.slice(0, 13).map(function (r) { return r.min; })))]] }),
      punten.length ? h("ul", { className: "rp-lijst" }, punten.filter(function (a) { return a.soort !== "info" || a.menu !== "dashboard"; }).map(function (a, i) { return h("li", { key: i }, a.tekst); })) : h("p", null, "Geen aandachtspunten.")) : null,
    rpAan(c, "prognose") ? h(RpSectie, { key: "prognose", id: "prognose", titel: "Vermogensprognose" },
      h(Staafgrafiek, { reeksen: VM_REEKS, punten: vr.slice(0, 25).map(function (r) { return { label: fmtMaandKort(r.d), waarden: VM_REEKS.map(function (s) { return s.comp.reduce(function (a, k) { return a + r.t[k]; }, 0); }) }; }), titel: "Vermogen per maand" }),
      h(Legenda, { reeksen: VM_REEKS }),
      h("p", { className: "klein" }, "In duizenden euro's, per maandeinde, komende 24 maanden."),
      h(Tabel, { className: "rp-tabel", kop: ["Einde jaar", "Spaargeld", "Deposito's", "Belegd", "Vrij vermogen"], get: [1, 2, 3, 4], rijen: [0, 1, 2, 3, 4].map(function (k) {
        var idx = vr.reduce(function (best, r, i) { return (r.d.getFullYear() === jaar0 + k && r.d.getMonth() === 11) ? i : best; }, -1);
        if (idx < 0) return null; var r = vr[idx]; return [String(jaar0 + k), eur(r.t.sparen), eur(r.t.deposito), eur(r.t.beleggen), eur(r.t.vrij)];
      }).filter(function (x) { return x; }) })) : null
  ]));
  var kl = kansen(c);
  out.push(secties([
    rpAan(c, "kansen") ? h(RpSectie, { key: "kansen", id: "kansen", titel: "Kansen: wat kan het opleveren?" },
      h(KansenSamenvatting, { lijst: kl }),
      h(KansenLijst, { lijst: kl, vinkjes: true }),
      h("p", { className: "klein" }, "Bedragen zijn berekend uit de gegevens in dit rapport en gelden voor een jaar, vóór belasting. Toeslagen worden hier niet uitgerekend: het bedrag volgt uit de proefberekening op toeslagen.nl.")) : null
  ]));
  if (aanbiedingen(m, 50).rijen.length) out.push(secties([
    rpAan(c, "aanbiedingen") ? h(RpSectie, { key: "aanb", id: "aanbiedingen", titel: "Nieuwe aanbiedingen en besparing" }, h(AanbiedingenRapport, { m: Object.assign({}, m, { rapport: S.rapport }) })) : null
  ]));
  out.push(secties([
    rpAan(c, "kalender") ? h(RpSectie, { key: "kalender", id: "kalender", titel: "Jaarkalender: wanneer doe je wat?" }, h(KalenderBlok, { c: c })) : null
  ]));
  // Pagina 2
  var tj = vr[j12].t;
  var evStart = sim.maand[0].d, evEind = sim.maand[j12].d;
  var ev12 = ev.filter(function (e) { return e.d > evStart && e.d <= evEind; });
  var perLabel = {}; ev12.forEach(function (e) { perLabel[e.label] = (perLabel[e.label] || 0) + e.delta; });
  var perSoort12 = {}; ev12.forEach(function (e) { var k = SOORT_LABEL[e.soort] || e.soort; perSoort12[k] = (perSoort12[k] || 0) + e.delta; });
  out.push(secties([
    rpAan(c, "vermogenverandering") ? h(RpSectie, { key: "vv", id: "vermogenverandering", titel: "Waardoor verandert het vermogen?" },
      h("p", { className: "klein" }, "Verschil tussen nu en " + fmtMaand(vr[j12].d) + "."),
      h(Tabel, { className: "rp-tabel", kop: ["Onderdeel", "Nu", "Over 12 maanden", "Verschil"], get: [1, 2, 3], rijen: ["sparen", "deposito", "beleggen", "reserv", "gebonden", "overig", "uitstaand", "schuld", "hypotheek"].map(function (k) { return (Math.abs(t0[k]) + Math.abs(tj[k]) < 1) ? null : [COMP_NAAM[k] || "Pensioen en aanvulling", eur(t0[k]), eur(tj[k]), eur(tj[k] - t0[k])]; }).filter(function (x) { return x; }).concat([{ klasse: "totaal", cellen: ["Totaal vermogen", eur(t0.totaal), eur(tj.totaal), eur(tj.totaal - t0.totaal)] }]) })) : null,
    rpAan(c, "spaarverandering") ? h(RpSectie, { key: "sv", id: "spaarverandering", titel: "Waardoor verandert het spaargeld?" },
      h(Tabel, { className: "rp-tabel", kop: ["Post (komende 12 maanden)", "Bedrag"], get: [1], rijen: Object.keys(perSoort12).sort(function (a, b) { return Math.abs(perSoort12[b]) - Math.abs(perSoort12[a]); }).map(function (k) { return [k, eur(perSoort12[k])]; }).concat([{ klasse: "totaal", cellen: ["Totaal verandering spaargeld", eur(vr[j12].spaar - vr[0].spaar)] }]) })) : null
  ]));
  // Pagina 3
  var bijzonder = ev12.filter(function (e) { return ["boeking", "depoRente", "depoVrijval", "depoStart", "aanvulmutatie"].indexOf(e.soort) >= 0; }).sort(function (a, b) { return a.d - b.d; });
  out.push(secties([
    rpAan(c, "mutaties") ? h(RpSectie, { key: "mut", id: "mutaties", titel: "Belangrijkste mutaties, komende 12 maanden" },
      bijzonder.length ? h(Tabel, { className: "rp-tabel", kop: ["Datum", "Post", "Bedrag"], get: [2], rijen: bijzonder.slice(0, 40).map(function (e) { return [fmtDatum(e.d), e.label, eur(e.delta || e.resDelta)]; }) }) : h("p", null, "Geen bijzondere mutaties gepland.")) : null,
    rpAan(c, "genoeg") ? h(RpSectie, { key: "gg", id: "genoeg", titel: "Heb ik genoeg spaargeld?" },
      h("p", { className: "klein" }, "Laagste punt per maand ten opzichte van je minimum van " + eur(min) + "."),
      h(Tabel, { className: "rp-tabel", kop: ["Maand", "Laagste punt", "Verschil met minimum", "Status"], get: [1, 2], rijen: vr.slice(1, 25).map(function (r) { return [fmtMaand(r.d), eur(r.min), eur(r.min - min), r.min < 0 ? "Onder nul" : r.min < min ? "Onder minimum" : "Genoeg"]; }) })) : null
  ]));
  // Pagina 4: deposito's
  var deps = (S.verm.deposito || []).map(function (d) { return { d: d, pl: depositoPlan(m, d) }; });
  var jaren5 = []; for (var jj = jaar0; jj <= jaar0 + 4; jj++) jaren5.push(jj);
  out.push(secties([
    (rpAan(c, "deposito") && m.profiel.gebruik.deposito) ? h(RpSectie, { key: "dep", id: "deposito", titel: "Deposito's" },
      deps.length ? h(Tabel, { className: "rp-tabel", kop: ["Deposito", "Bedrag", "Rente", "Start", "Einde", "Rente totaal"], get: [1, 2, 5], rijen: deps.map(function (x) { return [x.d.naam || "–", eur(x.d.bedrag), pct(x.d.rente, 2), fmtDatum(x.d.start), x.pl ? fmtDatum(x.pl.eind) : "–", x.pl ? eur(x.pl.totaleRente) : "–"]; }) }) : h("p", null, "Geen deposito's ingevuld.")) : null,
    (rpAan(c, "depositorente") && m.profiel.gebruik.deposito) ? h(RpSectie, { key: "depr", id: "depositorente", titel: "Rente van deposito's per jaar" },
      deps.length ? h(Tabel, { className: "rp-tabel", kop: ["Deposito"].concat(jaren5.map(String)), get: jaren5.map(function (_, i) { return i + 1; }), rijen: deps.map(function (x) { return [x.d.naam || "–"].concat(jaren5.map(function (y) { var v = depositoRenteJaartabel(m, x.d, y); return v ? eur(v) : "–"; })); }) }) : h("p", null, "Geen deposito's ingevuld."),
      h("p", { className: "klein" }, "Rente wordt gerekend in het jaar van uitkering.")) : null
  ]));
  // Pagina 5: beleggen en pensioen
  out.push(secties([
    rpAan(c, "beleggen") ? h(RpSectie, { key: "bel", id: "beleggen", titel: "Beleggen en pensioen" },
      (S.verm.beleggingen || []).length ? h(Tabel, { className: "rp-tabel", kop: ["Beleggingen", "Soort", "Waarde nu", "Over 12 maanden"], get: [2, 3], rijen: (S.verm.beleggingen || []).map(function (b) { var it = vr[j12].items.filter(function (x) { return x.key === "bel" + b.id; })[0]; return [b.naam || "–", b.soort === "pensioen" ? "Pensioen" : "Vrij", eur(b.waarde), eur(it ? it.waarde : 0)]; }) }) : null,
      m.potten.length ? h(Tabel, { className: "rp-tabel", kop: ["Pot", "Van", "Saldo nu", "Uitkering gaat in", "Per maand bruto"], get: [2, 4], rijen: m.potten.map(function (pt) { var pl = potPlan(m, pt); return [pt.naam || "–", persoonVan(m, pt.persoon).naam, eur(pt.saldo), pl ? fmtDatum(pl.start) : "–", pl ? eur(pl.maand) : "–"]; }) }) : null,
      aanvulPlan(m).length ? h("p", null, "Inkomensaanvulling: " + eur(S.aanv.maand) + " per maand tot " + fmtMaand(m.aanvB.eind) + ", gereserveerd uit " + (m.aanvB.bron === "sparen" ? "spaargeld" : "beleggingen") + ": " + eur(m.aanv.startsaldo) + ".") : null,
      (!(S.verm.beleggingen || []).length && !m.potten.length && !aanvulPlan(m).length) ? h("p", null, "Geen beleggingen of pensioenpotten ingevuld.") : null) : null
  ]));
  // Pagina 6: advies
  var AS = A && m.profiel.gebruik.beleggen ? adviesSamenvatting(m, A) : null;
  var plan = A ? herbalanceerPlan(m, A) : null;
  var mk = (S.advies.markt && S.advies.markt.punten.length) ? S.advies.markt : ADVIES_MARKT_STANDAARD;
  out.push(secties([
    (rpAan(c, "advies") && AS) ? h(RpSectie, { key: "adv", id: "advies", titel: "Beleggingsadvies (vrij beleggen)" },
      h("ul", { className: "rp-lijst" }, AS.regels.map(function (r, i) { return h("li", { key: i }, r); })),
      A.koopBasis > 0 ? h("div", null, h("h3", null, "Bijbeleggen"), h("ul", { className: "rp-lijst" }, adviesRegelsKoop(m, A).map(function (r, i) { return h("li", { key: i }, r.tekst); }))) : null,
      (plan && plan.aanbeveling === "gefaseerd") ? h("div", null, h("h3", null, "Bestaande portefeuille" + (plan.wachten ? " (pas bij herstel)" : "")), plan.stappen.map(function (st) {
        return h("p", { key: st.nr }, h("b", null, "Stap " + st.nr + " (" + fmtMaand(st.datum) + "): "), st.verkoop.map(function (v) { return "VERKOPEN " + (v.isin || v.naam) + " " + eur(v.bedrag); }).join("; "), "; ", ["off", "neu", "def"].filter(function (k) { return st.koop[k] > 0; }).map(function (k) { return "KOPEN " + koopTekst(m, A, k, st.koop[k]); }).join("; "));
      })) : null,
      A.waarnemingen.length ? h("ul", { className: "rp-lijst" }, A.waarnemingen.map(function (r, i) { return h("li", { key: "w" + i }, r); })) : null,
      h("h3", null, "Marktbeeld (" + fmtDatum(mk.datum) + ")"), h("ul", { className: "rp-lijst" }, mk.punten.map(function (r, i) { return h("li", { key: "m" + i }, r); }))) : null
  ]));
  // Pagina 7: fasen en lasten
  var l0 = lastenPerMaandGemiddeld(m, eerstVanMaand(m.peil));
  out.push(secties([
    rpAan(c, "fases") ? h(RpSectie, { key: "fases", id: "fases", titel: "Inkomen per fase" }, fasen.length ? h(FasenTabel, { m: m }) : h("p", null, "Nog geen inkomen ingevuld.")) : null,
    rpAan(c, "lasten") ? h(RpSectie, { key: "lasten", id: "lasten", titel: "Vaste lasten en dagelijkse uitgaven" },
      (S.lasten || []).length ? h(Tabel, { className: "rp-tabel", kop: ["Post", "Bedrag", "Hoe vaak", "Indexatie"], get: [1], rijen: S.lasten.map(function (p) { return [p.naam || "–", eur(p.bedrag), (FREQ_KEUZES.filter(function (f) { return f[0] === p.freq; })[0] || ["", ""])[1], p.index === "cpi" ? "CPI" : p.index === "vast" ? pct(p.indexPct, 1) : "geen"]; }) }) : null,
      (m.hyp.delen || []).length ? h(Tabel, { className: "rp-tabel", kop: ["Hypotheekdeel", "Box", "Openstaand", "Rente", "Maandlast", "Rente herzien"], get: [2, 3, 4], rijen: m.hyp.delen.map(function (dl, i) { var r = hypDeelOp(m, dl, m.peil); return ["Deel " + (i + 1), dl.box || "?", eur(r.saldo), pct(dl.rente, 2), eur(r.maandlast), dl.variabel ? "variabel" : fmtDatum(dl.herzienDatum)]; }) }) : null,
      h(KV, { rijen: [["Vaste lasten per maand (gemiddeld)", eur(l0.vast)], ["Dagelijkse uitgaven per maand", eur(l0.dagelijks)], ["Hypotheek per maand", eur(l0.hypotheek)], ["Totaal per maand", eur(l0.totaal), true]] })) : null
  ]));
  // Pagina 8: grote posten en automatische boekingen
  out.push(secties([
    rpAan(c, "grote") ? h(RpSectie, { key: "grote", id: "grote", titel: "Grote inkomsten en uitgaven" },
      (S.grote.boekingen || []).length ? h(Tabel, { className: "rp-tabel", kop: ["Datum", "Omschrijving", "Soort", "Bedrag", "Herhaling"], get: [3], rijen: S.grote.boekingen.slice().sort(function (a, b) { return (geldigeDatum(a.datum) || 0) - (geldigeDatum(b.datum) || 0); }).map(function (b) { return [fmtDatum(b.datum), b.omschrijving || "–", b.type === "inkomst" ? "Inkomst" : "Uitgave", eur(b.bedrag), b.herhaal === "jaarlijks" ? "Elk jaar" : "Eenmalig"]; }) }) : h("p", null, "Geen geplande grote posten.")) : null,
    rpAan(c, "auto") ? h(RpSectie, { key: "auto", id: "auto", titel: "Automatische boekingen op het spaargeld" },
      h("ul", { className: "rp-lijst" },
        h("li", null, "Netto inkomen wordt op de " + (getal(m.inst.dagInkomen) || 25) + "e van de maand bijgeschreven."),
        h("li", null, "Vaste lasten, dagelijkse uitgaven en hypotheek worden op de " + (getal(m.inst.dagLasten) || 1) + "e afgeschreven."),
        (S.grote.reserveringen || []).map(function (r) { return h("li", { key: r.id }, "Reservering " + (r.naam || "") + ": " + eur(r.maand) + " op de " + (getal(r.dag) || 22) + "e."); }),
        h("li", null, "Rente op de spaarrekening wordt per dag berekend en op 31 december bijgeschreven."),
        h("li", null, "Deposito's keren aan het einde van de looptijd uit naar de spaarrekening (rente volgens de gekozen uitkering)."))) : null
  ]));
  // Pagina 9: aannames en toelichting
  out.push(secties([
    rpAan(c, "aannames") ? h(RpSectie, { key: "aan", id: "aannames", titel: "Aannames en controles" },
      h(KV, { rijen: [["Peildatum", fmtDatum(m.peil)], ["Inflatie (CPI) per jaar", pct(m.inst.cpi, 1) + " (gecontroleerd: " + (m.inst.cpiStand ? fmtDatum(m.inst.cpiStand) : "nee") + ")"], ["Spaarrente", pct(m.inst.spaarrente, 2) + " (gecontroleerd: " + (m.inst.spaarrenteStand ? fmtDatum(m.inst.spaarrenteStand) : "nee") + ")"], ["Rendement beleggen", pct(m.inst.rendBeleggen, 1)], ["Indexatie schijven en AOW", pct(m.inst.indexSchijven, 1) + " en " + pct(m.inst.indexAOW, 1)], ["Fiscale tabel", "stand " + fmtDatum(fiscaalTabel(m).stand) + ", laatste jaar " + fiscaalTabel(m).laatste], ["Versie van de app", APP_VERSIE]] }),
      h("ul", { className: "rp-lijst" }, fiscaalWaarschuwingen(m, m.nu).map(function (t, i) { return h("li", { key: i }, t); }))) : null,
    rpAan(c, "toelichting") ? h(RpSectie, { key: "toel", id: "toelichting", titel: "Toelichting" },
      h("ul", { className: "rp-lijst" },
        h("li", null, "Dit rapport bevat rekenvoorbeelden op basis van de gegevens en aannames hierboven. Het is geen persoonlijk financieel, fiscaal of beleggingsadvies."),
        h("li", null, "Toekomstige bedragen zijn geschat met de ingevulde indexatie en rendementen. De werkelijkheid kan afwijken."),
        h("li", null, "Bronnen: Belastingdienst, SVB, CBS en Rijksoverheid voor fiscale cijfers en AOW; de eigen bank voor spaar- en depositorentes; DEGIRO en de aanbieder voor fondsen."),
        h("li", null, "Alle gegevens staan alleen op het apparaat waarop je de app gebruikt."))) : null
  ]));
  return h("div", null, out.filter(function (x) { return x; }));
}
function SchermRapport() {
  var c = useC(), m = c.m, S = c.S;
  return h("div", null,
    h(IntakeKnop, { menu: "rapport" }),
    h("div", { className: "kaart noprint" },
      h("div", { className: "rij" },
        h(Knop, { onClick: function () { window.print(); }, naam: "afdrukken" }, "Afdrukken of opslaan als PDF"),
        h("span", { className: "klein" }, "Kies in het afdrukvenster 'Opslaan als PDF'. Formaat A4.")),
      h("details", { style: { marginTop: ".5rem" } }, h("summary", { className: "klein" }, "Wat staat er in het rapport?"), h(BedragVeld, { label: "Vergoeding nieuwe aanbiedingen (% van de besparing in jaar 1)", value: S.rapport.vergoedingPct, pct: true, onChange: function (v) { c.zet("rapport", { vergoedingPct: v }); }, naam: "vergoeding-pct" }), h(TekstVeld, { label: "Titel", value: S.rapport.titel, onChange: function (v) { c.zet("rapport", { titel: v }); }, naam: "rapport-titel" }), h(RapportKeuzes, null))),
    h("style", null, "@media print{@page{size:A4;margin:18mm 14mm 16mm 14mm;@top-left{content:\"" + String((S.rapport.titel || "Inkomensplanning") + " · peildatum " + fmtDatum(m.peil)).replace(/[\\"\n]/g, " ") + "\";font-size:8.5pt;color:#475569}@bottom-center{content:\"Pagina \" counter(page) \" van \" counter(pages);font-size:8.5pt;color:#475569}}}"),
    h("div", { className: "rp-kopblok", style: { marginBottom: ".6rem" } }, h("h1", null, S.rapport.titel || "Inkomensplanning"), h("p", { className: "klein" }, "Peildatum " + fmtDatum(m.peil) + " · " + m.personen.map(function (p) { return p.naam; }).join(" en ") + " · versie " + APP_VERSIE)),
    h(RapportInhoud, null));
}
