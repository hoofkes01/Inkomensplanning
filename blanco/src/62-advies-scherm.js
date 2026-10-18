/* ===== Scherm: Beleggingsadvies ===== */
function AdviesProfielVelden() {
  var c = useC(), a = c.S.advies, rn = useState(function () { return "rp" + nieuwId(); })[0];
  return h("div", null,
    ["defensief", "neutraal", "offensief"].map(function (k) {
      var pr = RISICO_PROFIELEN[k];
      return h("label", { key: k, className: "vink", style: { padding: ".4rem .5rem", border: "1px solid #e2e8f0", borderRadius: ".6rem", background: a.risico === k ? "#f1f5f9" : "#fff" } },
        h("input", { type: "radio", name: rn, checked: a.risico === k, onChange: function () { c.zet("advies", { risico: k }); }, "data-profiel": k }),
        h("span", null, h("b", null, pr.naam), h("br", null), pr.uitleg, h("br", null), h("span", { className: "klein" }, "Bij een koersdaling van aandelen met 25% verlies je ongeveer " + Math.round(profielVerlies(pr)) + "% van je belegde bedrag.")));
    }),
    h(KeuzeVeld, { label: "Waar belegt je (of wil je beleggen)?", hint: "Niet iedereen zit bij DEGIRO. Niet elke broker biedt elk fonds; de app laat per categorie meer dan één fonds zien.", value: a.broker, opties: [["", "Kies je broker"]].concat(BROKERS.map(function (b) { return [b, b]; })), onChange: function (v) { c.zet("advies", { broker: v }); }, naam: "broker" }));
}
function AdviesDoelVelden() {
  var c = useC(), a = c.S.advies, P = adviesParams(c.m);
  function z(patch) { c.zet("advies", patch); }
  var som = P.doel.off + P.doel.neu + P.doel.def;
  return h("div", null,
    h(Vink, { label: "Eigen verdeling gebruiken in plaats van het profiel", value: !!a.eigenDoel, onChange: function (v) { z({ eigenDoel: v }); } }),
    a.eigenDoel ? h("div", { className: "raster3" },
      h(BedragVeld, { label: "Offensief (%)", value: a.doelOff, pct: true, onChange: function (v) { z({ doelOff: v }); }, naam: "doelOff" }),
      h(BedragVeld, { label: "Neutraal (%)", value: a.doelNeu, pct: true, onChange: function (v) { z({ doelNeu: v }); }, naam: "doelNeu" }),
      h(BedragVeld, { label: "Defensief (%)", value: a.doelDef, pct: true, onChange: function (v) { z({ doelDef: v }); }, naam: "doelDef" })) : null,
    som > 0 ? h("p", { className: "klein" }, "Verdeling nu: " + Math.round(P.doel.off / som * 100) + "% offensief, " + Math.round(P.doel.neu / som * 100) + "% neutraal, " + Math.round(P.doel.def / som * 100) + "% defensief.") : null);
}
function AdviesVoorkeurVelden() {
  var c = useC(), a = c.S.advies;
  return h("div", null,
    h(Vink, { label: "Fondsen die ik wil behouden niet verkopen", hint: "Vink bij je portefeuille aan welke fondsen dat zijn. Ze tellen wel mee in hun categorie.", value: a.behoudAan, onChange: function (v) { c.zet("advies", { behoudAan: v }); } }),
    h(BedragVeld, { label: "Wachtgrens: pas omzetten als de portefeuille minstens zoveel waard is", hint: "Leeg = geen wachtgrens.", value: a.wachtTot, onChange: function (v) { c.zet("advies", { wachtTot: v }); }, naam: "wachtTot" }));
}
function AdviesRenteVelden() {
  var c = useC(), a = c.S.advies;
  function z(patch) { c.zet("advies", patch); }
  var P = adviesParams(c.m);
  return h("div", null,
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Raisin deposito 6 maanden: hoogste rente (%)", value: a.raisin6, pct: true, onChange: function (v) { z({ raisin6: v }); }, naam: "raisin6" }),
      h(DatumVeld, { label: "Stand Raisin op", value: a.raisinStand, onChange: function (v) { z({ raisinStand: v }); }, naam: "raisinStand" })),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Euribor 12 maanden (%)", value: a.euribor, pct: true, onChange: function (v) { z({ euribor: v }); } }),
      h(DatumVeld, { label: "Stand Euribor op", value: a.euriborStand, onChange: function (v) { z({ euriborStand: v }); } })),
    h("div", { className: "rij" }, h(Knop, { soort: "sec", klein: true, onClick: function () { z({ raisinStand: isoDatum(vandaag()), euriborStand: isoDatum(vandaag()) }); }, naam: "rente-vandaag" }, "Beide rentes zijn vandaag gecontroleerd")),
    ouderDan(a.raisinStand, 7, c.m.nu) ? h("p", { className: "oranje klein" }, "De Raisin-stand is ouder dan 7 dagen of niet ingevuld.") : null,
    h("details", null, h("summary", { className: "klein" }, "Belasting en marge"),
      h("div", { className: "raster" },
        h(BedragVeld, { label: "Belastingtarief box 3 (%)", value: a.belasting, pct: true, onChange: function (v) { z({ belasting: v }); } }),
        h(KeuzeVeld, { label: "Stelsel", value: a.stelsel, opties: [["forfait", "Huidig (fictief rendement)"], ["werkelijk", "Werkelijk rendement"]], onChange: function (v) { z({ stelsel: v }); } })),
      h("div", { className: "raster3" },
        h(BedragVeld, { label: "Fictief rendement sparen (%)", value: a.forfaitSparen, pct: true, onChange: function (v) { z({ forfaitSparen: v }); } }),
        h(BedragVeld, { label: "Fictief rendement beleggen (%)", value: a.forfaitBeleg, pct: true, onChange: function (v) { z({ forfaitBeleg: v }); } }),
        h(BedragVeld, { label: "Marge na belasting (procentpunt)", value: a.marge, pct: true, onChange: function (v) { z({ marge: v }); } }))),
    h("p", { className: "klein" }, "Ondergrens defensief fonds: " + pct(adviesMinDef(P), 2) + " bruto na kosten (Raisin na belasting " + pct(adviesNettoRaisin(P), 2) + " plus marge)."));
}

/* ----- Portefeuille invoeren ----- */
function sluitVrijBeleggenAan(c, totaal) {
  var L = c.lijst("verm", "beleggingen"), vrij = L.items.filter(function (b) { return b.soort === "vrij"; });
  var doel = vrij.filter(function (b) { return b.id === c.S.advies.rekeningId; })[0] || vrij[0];
  if (doel) L.wijzig(doel.id, { waarde: Math.round(totaal) });
  else { var id = nieuwId(); L.voeg({ id: id, bank: "Vrij beleggen", naam: "Vrij beleggen", waarde: Math.round(totaal), soort: "vrij" }); c.zet("advies", { rekeningId: id }); }
}
function AdviesPortefeuille() {
  var c = useC(), a = c.S.advies;
  var s1 = useState(""), tekst = s1[0], setTekst = s1[1];
  var s2 = useState(null), voorbeeld = s2[0], setVoorbeeld = s2[1];
  var s3 = useState(""), melding = s3[0], setMelding = s3[1];
  var pf = a.pf || [];
  var totaal = pf.reduce(function (s, x) { return s + getal(x.waarde); }, 0);
  function lees(t) { var l = adviesParseUpload(t); setVoorbeeld(l); setMelding(l.length ? l.length + " posities gevonden." : "Er zijn geen posities gevonden. Schermafbeeldingen kan de app niet lezen: plak de tekst of upload de csv."); }
  function gebruik() {
    var nieuw = voorbeeld.map(function (x) { return { id: nieuwId(), naam: x.naam, isin: x.isin, waarde: x.waarde, cat: "auto", behoud: false }; });
    c.zet("advies", { pf: nieuw, pfDatum: isoDatum(vandaag()) }); setVoorbeeld(null); setTekst("");
    sluitVrijBeleggenAan(c, nieuw.reduce(function (s, x) { return s + x.waarde; }, 0));
  }
  var L = c.lijst("advies", "pf");
  return h("div", null,
    h("div", { className: "kaart", style: { background: "#f8fafc" } },
      h("b", null, "Upload of plak je portefeuille"),
      h("p", { className: "klein" }, "Een csv van je broker (bij DEGIRO: Portefeuille exporteren), een geplakte lijst met naam en waarde, of de tekst uit de app. Schermafbeeldingen kan de app niet lezen."),
      h("input", { type: "file", accept: ".csv,.txt,text/csv,text/plain", "data-veld": "pf-bestand", onChange: function (e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { setTekst(String(r.result)); lees(String(r.result)); }; r.readAsText(f); e.target.value = ""; } }),
      h("textarea", { rows: 4, value: tekst, placeholder: "Of plak hier de tekst", "data-veld": "pf-tekst", style: { marginTop: ".4rem" }, onChange: function (e) { setTekst(e.target.value); } }),
      h("div", { className: "rij", style: { marginTop: ".4rem" } }, h(Knop, { soort: "sec", disabled: !tekst.trim(), onClick: function () { lees(tekst); }, naam: "pf-lees" }, "Tekst lezen")),
      melding ? h("p", { className: "klein", role: "status" }, melding) : null,
      voorbeeld && voorbeeld.length ? h("div", null, h(Tabel, { kop: ["Fonds", "ISIN", "Waarde"], get: [2], rijen: voorbeeld.map(function (x) { return [x.naam, x.isin || "–", eur(x.waarde)]; }) }),
        h("div", { className: "rij", style: { marginTop: ".4rem" } }, h(Knop, { onClick: gebruik, naam: "pf-gebruik" }, "Gebruik deze lijst (vervangt de huidige)"))) : null),
    h(LijstEditor, {
      naam: "pf", items: pf.map(function (x, i) { return Object.assign({ id: x.id || ("pf" + i) }, x); }), leeg: "Nog geen posities.", voegTekst: "Positie toevoegen",
      kop: function (x) { return (x.naam || "Nieuwe positie") + (getal(x.waarde) ? " · " + eur(x.waarde) : ""); },
      onVoeg: function () { c.zet("advies", { pf: pf.concat([{ id: nieuwId(), naam: "", isin: "", waarde: "", cat: "auto", behoud: false }]), pfDatum: isoDatum(vandaag()) }); },
      onWis: function (id) { c.zet("advies", { pf: pf.filter(function (x, i) { return (x.id || ("pf" + i)) !== id; }) }); },
      onWijzig: function (id, patch) { c.zet("advies", { pf: pf.map(function (x, i) { return (x.id || ("pf" + i)) === id ? Object.assign({}, x, patch) : x; }) }); },
      velden: function (x, w) {
        return h("div", null,
          h("div", { className: "raster" }, h(TekstVeld, { label: "Fonds", value: x.naam, onChange: function (v) { w({ naam: v }); } }), h(TekstVeld, { label: "ISIN", value: x.isin, onChange: function (v) { w({ isin: v.toUpperCase() }); } })),
          h("div", { className: "raster" }, h(BedragVeld, { label: "Waarde in euro", value: x.waarde, onChange: function (v) { w({ waarde: v }); } }),
            h(KeuzeVeld, { label: "Categorie", value: x.cat || "auto", opties: [["auto", "Automatisch (" + ADVIES_CAT[adviesCategorie(x.naam, x.isin)] + ")"], ["def", "Defensief"], ["neu", "Neutraal"], ["off", "Offensief"]], onChange: function (v) { w({ cat: v }); } })),
          h(Vink, { label: "Dit fonds niet verkopen", value: !!x.behoud, onChange: function (v) { w({ behoud: v }); } }));
      }
    }),
    h("p", { className: "klein" }, "Totaal " + eur(totaal) + (a.pfDatum ? " · bijgewerkt op " + fmtDatum(a.pfDatum) : "") + "."),
    pf.length ? h("div", { className: "rij" }, h(Knop, { soort: "sec", klein: true, onClick: function () { sluitVrijBeleggenAan(c, totaal); }, naam: "pf-naar-vermogen" }, "Neem dit totaal over in Vermogen"), h(Knop, { soort: "sec", klein: true, onClick: function () { c.zet("advies", { pfDatum: isoDatum(vandaag()) }); }, naam: "pf-actueel" }, "Portefeuille is vandaag gecontroleerd")) : null);
}

/* ----- Het scherm ----- */
function adviesRegelsKoop(m, A) {
  var uit = [];
  ["off", "neu", "def"].forEach(function (cat) {
    var b = A.koop[cat]; if (!(b > 0)) return;
    var regels = adviesKoopRegels(m, cat, b, A.P);
    if (!regels.length) { uit.push({ cat: cat, tekst: "Deposito " + eur(b) + " (geen defensief fonds haalt de ondergrens)" }); return; }
    regels.forEach(function (x) {
      if (cat === "off") { var t = drieTranches(x.bedrag); uit.push({ cat: cat, tekst: "KOPEN " + (x.f.isin || "ISIN onbekend") + " " + eur(x.bedrag) + " (" + x.f.naam + ") in 3 maandelijkse delen: " + t.map(function (v, i) { return fmtMaand(plusMaanden(m.peil, i)) + " " + eur(v); }).join(", ") }); }
      else uit.push({ cat: cat, tekst: "KOPEN " + (x.f.isin || "ISIN onbekend") + " " + eur(x.bedrag) + " (" + x.f.naam + ")" });
    });
  });
  return uit;
}
function AdviesBijbeleggen(p) {
  var m = p.m, A = p.A, regels = adviesRegelsKoop(m, A);
  return h("div", null,
    h(KV, { rijen: [["Direct opneembaar spaargeld nu", eur(A.spaarNu)], ["Laagste punt komende 12 maanden", eur(A.minKomend)], ["Drempel", eur(A.P.drempel)], ["Ruimte boven de drempel nu", eur(A.ruimteNu)], ["Blijvend boven de drempel", eur(A.blijvendNu)], ["Te beleggen", eur(afr10(A.koopBasis)), true]] }),
    A.tekortKomend > 0 ? h("p", { className: "klein" }, "Let op: in de prognose komt je spaargeld tijdelijk " + eur(A.tekortKomend) + " onder de drempel. Dat is informatief; bijbeleggen kan alleen met geld dat blijvend boven de drempel blijft.") : null,
    A.koopBasis > 0 ? h("div", null, h("h4", { style: { marginTop: ".6rem" } }, "Voorstel"), regels.length ? h("ul", { className: "lijst" }, regels.map(function (r, i) { return h("li", { key: i }, h("span", { className: "kleurpunt", style: { background: ADVIES_KLEUR[r.cat] } }), r.tekst); })) : h("p", { className: "klein" }, "Geen verdeling mogelijk: vul je portefeuille in."),
      h("p", { className: "klein" }, "Zoek zelf de koers op en bepaal het aantal. Afwegen tegen een deposito laat je aan jezelf; niets doen is altijd een optie.")) : h("p", null, "Nu niet bijbeleggen: je spaargeld blijft niet boven je drempel."));
}
function AdviesBestaand(p) {
  var m = p.m, A = p.A, plan = herbalanceerPlan(m, A);
  var cats = ["off", "neu", "def"];
  if (!plan) return h("p", { className: "klein" }, "Vul eerst je portefeuille in (tabblad Portefeuille).");
  return h("div", null,
    h(Tabel, { kop: ["", "Nu", "Doel", "Verschil"], get: [1, 2, 3], rijen: cats.map(function (cat) {
      var doelB = (A.somDoel > 0 ? A.doel[cat] / A.somDoel : 0) * plan.totaal;
      return [h("span", null, h("i", { className: "kleurpunt", style: { background: ADVIES_KLEUR[cat] } }), ADVIES_CAT[cat]), eur(A.huidig[cat]) + " (" + A.pct(A.huidig[cat], plan.totaal) + "%)", eur(doelB) + " (" + A.pct(doelB, plan.totaal) + "%)", eur(doelB - A.huidig[cat])];
    }) }),
    plan.wachten ? h(Waarschuwing, { soort: "info" }, h("b", null, "Nu nog niets verkopen."), " De waarde is " + eur(plan.totaal) + " en je wacht tot minimaal " + eur(plan.wachtTot) + " (nog " + eur(plan.nogTeGaan) + "). Het plan hieronder geldt pas bij herstel.") : null,
    plan.aanbeveling === "niets" ? h("p", { className: "groen" }, "Je zit dicht bij je doelverdeling (afwijking " + pct(plan.afwijking, 1) + "). Niets doen is het advies.") :
      h("div", null,
        h("p", null, "Voorstel: in vier stappen, één per kwartaal, " + plan.richting + " richting je doelverdeling. Herijk vóór elke stap met je actuele portefeuille."),
        plan.stappen.map(function (st) {
          return h("div", { key: st.nr, className: "kaart", style: { background: "#f8fafc", opacity: plan.wachten ? 0.7 : 1 } },
            h("b", null, "Stap " + st.nr + " · " + fmtMaand(st.datum) + (plan.wachten ? " (pas bij herstel)" : "")),
            h("ul", { className: "lijst" },
              st.verkoop.map(function (v, i) { return h("li", { key: "v" + i }, "VERKOPEN " + (v.isin || "ISIN onbekend") + " " + eur(v.bedrag) + " (" + v.naam + ")"); }),
              cats.filter(function (cat) { return st.koop[cat] > 0; }).map(function (cat) { return h("li", { key: "k" + cat }, "KOPEN " + (koopTekst(m, A, cat, st.koop[cat]) || ADVIES_CAT[cat] + " " + eur(st.koop[cat]))); })));
        })),
    h("h4", null, "Stresstest (geen voorspelling)"),
    h("p", null, "Bij een daling van aandelen met 25% (neutraal −12%, defensief −3%) verlies je nu circa " + eur(-plan.stressNu) + " en bij de doelverdeling circa " + eur(-plan.stressDoel) + "."));
}
function AdviesMarkt() {
  var c = useC(), mk = c.S.advies.markt || { datum: "", punten: [] };
  var ext = (c.S.cijfers || {}).markt;
  var gebruikt = mk.punten.length ? mk : (ext && ext.punten && ext.punten.length ? ext : ADVIES_MARKT_STANDAARD);
  var oud = ouderDan(gebruikt.datum, 30, c.m.nu);
  var L = c.lijst("advies", "markt");
  function z(patch) { c.zet("advies", { markt: Object.assign({}, gebruikt, patch) }); }
  return h("div", null,
    h("p", { className: "klein" }, "Marktbeeld op " + fmtDatum(gebruikt.datum) + (mk.punten.length ? " (door jou bijgewerkt)" : (ext && ext.punten && ext.punten.length ? " (via Cijfers bijwerken)" : " (meegeleverd met de app)")) + ". Geen voorspelling."),
    oud ? h("p", { className: "oranje klein" }, "Het marktbeeld is ouder dan een maand. Werk het bij of vraag om een nieuwe versie van de app.") : null,
    h("ul", { className: "lijst" }, gebruikt.punten.map(function (t, i) { return h("li", { key: i }, t); })),
    h("details", null, h("summary", { className: "klein" }, "Marktbeeld zelf aanpassen"),
      h(DatumVeld, { label: "Datum", value: gebruikt.datum, onChange: function (v) { z({ datum: v }); } }),
      h("textarea", { rows: 8, value: gebruikt.punten.join("\n"), "data-veld": "markt-tekst", onChange: function (e) { z({ punten: e.target.value.split("\n").filter(function (x) { return x.trim(); }) }); } }),
      h(Uitleg, null, "Eén punt per regel; 4 tot 5 punten werkt het best.")));
}
function AdviesFondsen() {
  var c = useC(), m = c.m, P = adviesParams(m);
  return h("div", null,
    h("p", { className: "klein" }, "Alleen accumulating ETF's (geen uitkeringen). Defensieve fondsen worden alleen voorgesteld als rendement min kosten de ondergrens van " + pct(adviesMinDef(P), 2) + " haalt. ISIN's gecontroleerd op " + fmtDatum(ADVIES_CHECK_DATUM) + " voor zover aangegeven; controleer altijd bij DEGIRO."),
    ADVIES_FONDSEN.map(function (f) {
      var r = fondsRend(m, f), eigen = (m.advies.rend || {})[f.isin] || {};
      return h("div", { key: f.isin, className: "kaart", style: { background: "#f8fafc" } },
        h("div", { className: "rij tussen" }, h("b", null, f.naam), h("span", { className: "badge " + (f.cat === "def" ? "goed" : "") , style: { background: ADVIES_KLEUR[f.cat], color: "#fff" } }, ADVIES_CAT[f.cat])),
        h("p", { className: "klein" }, "ISIN " + f.isin + (f.gecontroleerd ? " (gecontroleerd)" : " (controleer bij DEGIRO)") + " · kosten " + pct(f.ter, 2) + " · " + f.soort),
        f.cat === "def" ? h("div", null,
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Rendement (yield, % per jaar)", value: eigen.rend !== undefined && eigen.rend !== "" ? eigen.rend : (r.rend == null ? "" : r.rend), pct: true, onChange: function (v) { c.zetPad("advies", ["rend", f.isin], { rend: v, datum: isoDatum(vandaag()) }); } }),
            h(Veld, { label: "Voldoet aan de ondergrens?" }, h("div", { style: { paddingTop: ".5rem" } }, r.rend == null ? h("span", { className: "badge" }, "Rendement onbekend") : adviesVoldoetMin(m, f, P) ? h("span", { className: "badge goed" }, "Ja") : h("span", { className: "badge fout" }, "Nee (" + pct(r.rend - f.ter, 2) + " na kosten)")))),
          h("p", { className: "klein" }, "Bron rendement: " + (f.rendBron || "eigen invoer") + (r.datum ? " · stand " + fmtDatum(r.datum) : ""))) : null);
    }));
}
function AdviesKopen(p) {
  var m = p.m, A = p.A, lijst = adviesKopen(m, A), P = A.P;
  return h("div", null,
    h("p", null, P.risico ? "Bij jouw profiel (" + RISICO_PROFIELEN[P.risico].naam.toLowerCase() + ") kun je kopen in deze categorieën:" : "Kies eerst je beleggingsprofiel bij Instellingen. Hieronder staat het neutrale profiel."),
    h("div", { className: "kaart waarschuw" }, h("b", null, "Let op: niet iedereen zit bij DEGIRO."), h("p", null, "Zoek het fonds op via de ISIN in je eigen broker" + (P.broker && P.broker !== "Anders of weet ik niet" ? " (" + P.broker + ")" : "") + ". Staat het er niet bij, kies dan het andere fonds in dezelfde categorie, of een vergelijkbaar fonds: kapitaliserend (accumulating), breed gespreid en met lage kosten. De lijst is samengesteld met DEGIRO als uitgangspunt.")),
    lijst.map(function (x) {
      return h("div", { key: x.cat, className: "kaart", style: { background: "#f8fafc" }, "data-kopen": x.cat },
        h("div", { className: "rij tussen" }, h("b", null, ADVIES_CAT[x.cat]), h("span", { className: "badge", style: { background: ADVIES_KLEUR[x.cat], color: "#fff" } }, x.deel + "% van je beleggingen")),
        x.naarDeposito ? h("p", null, "Voor dit deel is een deposito of spaargeld nu aantrekkelijker dan een obligatiefonds. Houd dit deel in deposito's of spaargeld.") : null,
        x.fondsen.map(function (f) {
          return h("div", { key: f.isin, style: { padding: ".35rem 0", borderTop: "1px solid #e2e8f0" } },
            h("div", null, h("b", null, f.naam)),
            h("div", { className: "klein" }, "ISIN ", h("b", { style: { fontFamily: "monospace" } }, f.isin), " · kosten " + pct(f.ter, 2) + " per jaar · " + f.soort + (f.gecontroleerd ? "" : " · ISIN nog te controleren bij je broker")));
        }));
    }),
    h("p", { className: "klein" }, "De app toont ISIN's en bedragen, geen koersen of aantallen. Rekenvoorbeeld, geen persoonlijk beleggingsadvies."));
}
function SchermAdvies() {
  var c = useC(), m = c.m, sim = c.sim;
  var s = useState("advies"), tab = s[0], setTab = s[1];
  var A = useMemo(function () { try { return adviesBerekening(m, sim); } catch (e) { console.error(e); return null; } }, [m, sim]);
  var TABS = [["advies", "Advies"], ["kopen", "Wat kopen"], ["portefeuille", "Portefeuille"], ["markt", "Marktbeeld"], ["instellingen", "Instellingen"]];
  if (!m.profiel.gebruik.beleggen) return h("div", null, h(IntakeKnop, { menu: "advies" }), h(Kaart, { titel: "Beleggingsadvies" }, h("p", null, "Je hebt aangegeven niet te beleggen."), h(Knop, { onClick: function () { c.zetPad("profiel", ["gebruik", "beleggen"], true); }, naam: "zet-beleggen-aan" }, "Beginnen met beleggen")));
  var S = A ? adviesSamenvatting(m, A) : null;
  return h("div", null,
    h(IntakeKnop, { menu: "advies" }),
    h("div", { className: "tabs", role: "tablist" }, TABS.map(function (t) { return h("button", { key: t[0], type: "button", className: tab === t[0] ? "actief" : "", onClick: function () { setTab(t[0]); }, "data-tab": t[0] }, t[1]); })),
    tab === "advies" && A ? h("div", null,
      S ? h(Kaart, { titel: "Samenvatting", soort: "goed" }, S.regels.map(function (r, i) { return h("p", { key: i }, r); })) : null,
      h(Kaart, { titel: "Bijbeleggen" }, h(AdviesBijbeleggen, { m: m, A: A })),
      h(Kaart, { titel: "Bestaande portefeuille" }, h(AdviesBestaand, { m: m, A: A }), A.waarnemingen.length ? h("div", null, h("h4", { style: { marginTop: ".6rem" } }, "Waarnemingen"), h("ul", { className: "lijst" }, A.waarnemingen.map(function (t, i) { return h("li", { key: i }, t); }))) : null)) : null,
    tab === "kopen" && A ? h(Kaart, { titel: "Wat kun je kopen?" }, h(AdviesKopen, { m: m, A: A })) : null,
    tab === "portefeuille" ? h(Kaart, { titel: "Portefeuille (vrij beleggen)" }, h(AdviesPortefeuille, null)) : null,
    tab === "markt" ? h(Kaart, { titel: "Marktbeeld" }, h(AdviesMarkt, null)) : null,
    tab === "instellingen" ? h("div", null,
      h(Kaart, { titel: "Jouw profiel en broker" }, h(AdviesProfielVelden, null), h(Uitleg, null, "Je minimale buffer (" + eur(getal(m.grote.minimum)) + ") pas je aan bij Vermogen of Grote posten. Er wordt nooit bijbelegd met geld dat voor die buffer nodig is.")),
      h(Kaart, { titel: "Rentes en cijfers" }, h("p", { className: "klein" }, "Raisin 6 maanden: " + pct(adviesParams(m).raisin, 2) + " (stand " + (m.advies.raisinStand ? fmtDatum(m.advies.raisinStand) : "niet bijgewerkt") + "). Euribor 12 maanden: " + pct(adviesParams(m).euribor, 2) + "."), h(CijfersKnop, null)),
      h("details", null, h("summary", { className: "klein" }, "Geavanceerd (niet nodig voor gewoon gebruik)"),
        h("div", { className: "kaart waarschuw", style: { marginTop: ".4rem" } },
          h("h4", null, "Eigen verdeling"), h(AdviesDoelVelden, null),
          h("h4", { style: { marginTop: ".6rem" } }, "Voorkeuren"), h(AdviesVoorkeurVelden, null),
          h("h4", { style: { marginTop: ".6rem" } }, "Rentes en belasting handmatig"), h(AdviesRenteVelden, null),
          h("h4", { style: { marginTop: ".6rem" } }, "Fondsen en rendementen"), h(AdviesFondsen, null)))) : null,
    h("p", { className: "klein" }, "Rekenvoorbeeld, geen persoonlijk beleggingsadvies. Koersen en aantallen zoek je zelf op; de app toont namen, ISIN's en bedragen."));
}
