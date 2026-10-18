/* ===== Invoer-onderdelen die zowel in de menu's als in de intake worden gebruikt ===== */
function persOpties(m) { return m.personen.map(function (p) { return [p.id, p.naam]; }); }
function MaandVeld(p) {
  return h(Veld, { label: p.label, hint: p.hint, fout: p.fout },
    h("input", { type: "month", value: p.value || "", onChange: function (e) { p.onChange(e.target.value); }, "data-veld": p.naam }));
}
function datumFout(w, label) { return w && !geldigeDatum(w) ? label + ": datum is niet geldig." : null; }
function nietNeg(w, label) { return w !== "" && w != null && getal(w) < 0 ? label + ": mag niet negatief zijn." : null; }
function leeg(a) { return a.filter(function (x) { return x; }); }

/* ----- Basisgegevens ----- */
function BasisGegevens() {
  var c = useC(), p = c.S.profiel;
  function z(patch) { c.zet("profiel", patch); }
  return h("div", null,
    h(Vink, { label: "Ik plan voor twee personen (met partner)", value: p.partner, onChange: function (v) { z({ partner: v }); } }),
    h("div", { className: "raster" },
      h(TekstVeld, { label: "Naam of aanduiding persoon A", value: p.naamA, onChange: function (v) { z({ naamA: v }); }, naam: "naamA" }),
      p.partner ? h(TekstVeld, { label: "Naam of aanduiding persoon B", value: p.naamB, onChange: function (v) { z({ naamB: v }); }, naam: "naamB" }) : null),
    h("div", { className: "raster" },
      h(DatumVeld, { label: "Geboortedatum " + (p.naamA || "A"), value: p.geboorteA, onChange: function (v) { z({ geboorteA: v }); }, naam: "geboorteA" }),
      p.partner ? h(DatumVeld, { label: "Geboortedatum " + (p.naamB || "B"), value: p.geboorteB, onChange: function (v) { z({ geboorteB: v }); }, naam: "geboorteB" }) : null));
}
function AowKaart() {
  var c = useC(), p = c.S.profiel, m = c.m;
  function rij(pid, naam, geb, aowKey) {
    var ber = aowDatumBerekend(geb), tekst = aowLeeftijdTekst(geb), status = aowStatusTekst(geb, m.nu);
    return h("div", { key: pid, className: "kaart", style: { background: "#f8fafc" } },
      h("b", null, naam),
      geb ? h("p", { className: "klein" }, "AOW-leeftijd " + tekst + ": AOW-datum " + fmtDatum(ber) + ". " + status) : h("p", { className: "klein" }, "Vul eerst de geboortedatum in."),
      h(DatumVeld, { label: "AOW-datum aanpassen (leeg = berekende datum)", value: p[aowKey], onChange: function (v) { c.zet("profiel", (function () { var o = {}; o[aowKey] = v; return o; })()); }, naam: aowKey }));
  }
  return h("div", null, rij("A", p.naamA || "Persoon A", p.geboorteA, "aowA"), p.partner ? rij("B", p.naamB || "Persoon B", p.geboorteB, "aowB") : null);
}
function GebruikSchakelaars() {
  var c = useC(), g = c.S.profiel.gebruik;
  function z(k, v) { c.zetPad("profiel", ["gebruik", k], v); }
  return h("div", null,
    h(Vink, { label: "Ik heb een hypotheek", value: g.hypotheek, onChange: function (v) { z("hypotheek", v); } }),
    h(Vink, { label: "Ik heb deposito's", value: g.deposito, onChange: function (v) { z("deposito", v); } }),
    h(Vink, { label: "Ik heb beleggingen", value: g.beleggen, onChange: function (v) { z("beleggen", v); } }),
    h(Vink, { label: "Ik heb lijfrente of pensioenpotten die ik zelf opneem", value: g.pensioen, onChange: function (v) { z("pensioen", v); } }),
    h(Vink, { label: "Ik heb een pot die mijn inkomen tot de AOW aanvult", value: g.aanvulling, onChange: function (v) { z("aanvulling", v); } }));
}
function PeildatumVeld() {
  var c = useC();
  return h(DatumVeld, { label: "Peildatum (leeg = vandaag)", hint: "Alle bedragen die je invult gelden op deze datum. Laat leeg om altijd met vandaag te rekenen.", value: c.S.profiel.peildatum, onChange: function (v) { c.zet("profiel", { peildatum: v }); }, naam: "peildatum" });
}

/* ----- Inkomensbronnen ----- */
function nieuweBron(pid) { return { id: nieuwId(), persoon: pid, naam: "", soort: "loon", bruto: "", netto: "", start: "", einde: "", werktijd: 100, index: "cpi", indexPct: "", kortingInNetto: true, wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" }; }
function foutenBron(b) {
  return leeg([!b.naam ? "Geef elke inkomensbron een naam." : null, nietNeg(b.bruto, (b.naam || "Bron") + " bruto"), nietNeg(b.netto, (b.naam || "Bron") + " netto"),
    (b.bruto === "" && b.netto === "") ? (b.naam || "Een bron") + ": vul bruto of netto in." : null,
    datumFout(b.start, (b.naam || "Bron") + " start"), datumFout(b.einde, (b.naam || "Bron") + " einde"),
    (geldigeDatum(b.start) && geldigeDatum(b.einde) && geldigeDatum(b.einde) <= geldigeDatum(b.start)) ? (b.naam || "Bron") + ": de einddatum moet na de startdatum liggen." : null,
    (b.werktijd !== "" && (getal(b.werktijd) <= 0 || getal(b.werktijd) > 100)) ? (b.naam || "Bron") + ": werktijd moet tussen 1 en 100 procent liggen." : null]);
}
function BronnenEditor(p) {
  var c = useC(), L = c.lijst("bronnen");
  var items = L.items.filter(function (b) { return b.persoon === p.persoon; });
  return h(LijstEditor, {
    naam: "bron", items: items, leeg: "Nog geen inkomensbronnen voor deze persoon.", voegTekst: "Inkomensbron toevoegen",
    kop: function (b) { return (b.naam || "Nieuwe bron") + " · " + SOORT_NAAM[b.soort]; },
    onVoeg: function () { L.voeg(nieuweBron(p.persoon)); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null,
        h("div", { className: "raster" },
          h(TekstVeld, { label: "Naam", value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "bron-naam", placeholder: "bijv. salaris, pensioen" }),
          h(KeuzeVeld, { label: "Soort", value: b.soort, opties: SOORTEN_BRON, onChange: function (v) { w({ soort: v }); }, naam: "bron-soort" })),
        h("div", { className: "raster" },
          h(BedragVeld, { label: "Bruto per maand" + (b.soort === "loon" ? " (bij 100% werktijd)" : ""), value: b.bruto, onChange: function (v) { w({ bruto: v }); }, naam: "bron-bruto" }),
          h(BedragVeld, { label: "Netto per maand", hint: "Leeg laten: de app schat het netto uit het bruto.", value: b.netto, onChange: function (v) { w({ netto: v }); }, naam: "bron-netto" })),
        b.netto !== "" ? h(Vink, { label: "Dit netto bedrag is al na heffingskorting", hint: "Vink uit als het netto zonder heffingskorting is; de app telt dan de korting er één keer bij.", value: b.kortingInNetto !== false, onChange: function (v) { w({ kortingInNetto: v }); } }) : null,
        h("div", { className: "raster" },
          h(DatumVeld, { label: "Start (leeg = loopt al)", value: b.start, onChange: function (v) { w({ start: v }); }, naam: "bron-start" }),
          h(DatumVeld, { label: "Einde (vanaf deze dag geen inkomen meer)", hint: "Leeg = loopt door. Een einddatum op de 1e van een maand telt die maand niet meer mee.", value: b.einde, onChange: function (v) { w({ einde: v }); }, naam: "bron-einde" })),
        b.soort === "loon" ? h(BedragVeld, { label: "Werktijd (%)", hint: "100 = het ingevulde bedrag; 67 = tweederde.", value: b.werktijd, pct: true, onChange: function (v) { w({ werktijd: v }); }, naam: "bron-werktijd" }) : null,
        h("div", { className: "raster" },
          h(KeuzeVeld, { label: "Indexatie per 1 januari", value: b.index, opties: INDEX_KEUZES, onChange: function (v) { w({ index: v }); }, naam: "bron-index" }),
          b.index === "vast" ? h(BedragVeld, { label: "Percentage per jaar", value: b.indexPct, pct: true, onChange: function (v) { w({ indexPct: v }); }, naam: "bron-indexpct" }) : null),
        h("details", null, h("summary", { className: "klein" }, "Eenmalige wijziging (bijv. nieuwe pensioenregels)"),
          h("div", { className: "raster3", style: { marginTop: ".4rem" } },
            h(DatumVeld, { label: "Vanaf datum", value: b.wijzigDatum, onChange: function (v) { w({ wijzigDatum: v }); } }),
            h(BedragVeld, { label: "Nieuw bruto", value: b.wijzigBruto, onChange: function (v) { w({ wijzigBruto: v }); } }),
            h(BedragVeld, { label: "Nieuw netto", value: b.wijzigNetto, onChange: function (v) { w({ wijzigNetto: v }); } })),
          h(Uitleg, null, "Bedragen in prijzen van de peildatum; indexatie komt er daarna nog bovenop.")));
    }
  });
}
function WerkJarenTabel() {
  var c = useC(), m = c.m;
  return h("div", null, m.personen.map(function (p) {
    var jaren = [];
    var eind = p.aow ? p.aow.getFullYear() : m.peil.getFullYear() + 10;
    for (var j = m.peil.getFullYear(); j <= eind; j++) jaren.push(j);
    var wj = (c.S.werkJaren || {})[p.id] || {};
    return h("div", { key: p.id, className: "kaart", style: { background: "#f8fafc" } },
      h("b", null, p.naam + ": werk je dit jaar nog?"),
      h(Uitleg, null, "Haal het vinkje weg vanaf het jaar dat je stopt met werken. Loon telt nooit mee na de AOW-datum" + (p.aow ? " (" + fmtDatum(p.aow) + ")." : ".")),
      h("div", { className: "rij" }, jaren.map(function (j) {
        return h("label", { key: j, className: "vink", style: { margin: 0, minWidth: "5.2rem" } },
          h("input", { type: "checkbox", checked: wj[j] !== false, "data-werkjaar": p.id + j, onChange: function (e) { c.zetPad("werkJaren", [p.id, String(j)], e.target.checked ? true : false); } }), h("span", null, String(j)));
      })));
  }));
}

/* ----- Lijfrente en pensioenpotten ----- */
function nieuwePot(pid, m) { return { id: nieuwId(), persoon: pid, naam: "", soort: "lijfrente", saldo: "", geblokkeerdTot: "", start: "", rendVoor: m.inst.rendPot, rendTijdens: m.inst.rendPotTijdens, looptijd: 20, inleg: "", inlegTot: "" }; }
function foutenPot(b) {
  return leeg([!b.naam ? "Geef elke pensioenpot een naam." : null, nietNeg(b.saldo, (b.naam || "Pot") + " saldo"), nietNeg(b.inleg, (b.naam || "Pot") + " inleg"),
    datumFout(b.geblokkeerdTot, (b.naam || "Pot") + " geblokkeerd tot"), datumFout(b.start, (b.naam || "Pot") + " start uitkering"), datumFout(b.inlegTot, (b.naam || "Pot") + " inleg tot"),
    getal(b.looptijd) <= 0 ? (b.naam || "Pot") + ": vul een looptijd van de uitkering in (jaren)." : null]);
}
function PottenEditor() {
  var c = useC(), L = c.lijst("potten"), m = c.m;
  return h(LijstEditor, {
    naam: "pot", items: L.items, leeg: "Nog geen pensioenpotten of lijfrentes.", voegTekst: "Pot of lijfrente toevoegen",
    kop: function (b) { return (b.naam || "Nieuwe pot") + " · " + persoonVan(m, b.persoon).naam; },
    onVoeg: function () { L.voeg(nieuwePot("A", m)); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      var pl = potPlan(m, b);
      return h("div", null,
        h("div", { className: "raster" },
          h(TekstVeld, { label: "Naam", value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "pot-naam" }),
          h(KeuzeVeld, { label: "Van", value: b.persoon, opties: persOpties(m), onChange: function (v) { w({ persoon: v }); } })),
        h("div", { className: "raster" },
          h(KeuzeVeld, { label: "Soort", value: b.soort, opties: [["lijfrente", "Lijfrente"], ["pensioen", "Pensioenpot"]], onChange: function (v) { w({ soort: v }); } }),
          h(BedragVeld, { label: "Saldo nu", value: b.saldo, onChange: function (v) { w({ saldo: v }); }, naam: "pot-saldo" })),
        h("div", { className: "raster" },
          h(DatumVeld, { label: "Geblokkeerd tot (leeg = niet geblokkeerd)", value: b.geblokkeerdTot, onChange: function (v) { w({ geblokkeerdTot: v }); } }),
          h(DatumVeld, { label: "Uitkering gaat in op (leeg = AOW-datum)", value: b.start, onChange: function (v) { w({ start: v }); } })),
        h("div", { className: "raster3" },
          h(BedragVeld, { label: "Rendement tot de uitkering (%)", value: b.rendVoor, pct: true, onChange: function (v) { w({ rendVoor: v }); } }),
          h(BedragVeld, { label: "Rendement tijdens de uitkering (%)", value: b.rendTijdens, pct: true, onChange: function (v) { w({ rendTijdens: v }); } }),
          h(BedragVeld, { label: "Looptijd uitkering (jaren)", value: b.looptijd, pct: true, onChange: function (v) { w({ looptijd: v }); }, naam: "pot-looptijd" })),
        h("div", { className: "raster" },
          h(BedragVeld, { label: "Inleg per jaar", value: b.inleg, onChange: function (v) { w({ inleg: v }); } }),
          h(DatumVeld, { label: "Inleg tot (leeg = tot de uitkering)", value: b.inlegTot, onChange: function (v) { w({ inlegTot: v }); } })),
        pl ? h("p", { className: "klein" }, "Verwacht kapitaal bij start (" + fmtDatum(pl.start) + "): " + eur(pl.kapitaalStart) + ". Uitkering: " + eur(pl.maand) + " bruto per maand, " + Math.round(pl.L / 12 * 10) / 10 + " jaar lang.") : h("p", { className: "klein" }, "Vul de geboortedatum in of kies een startdatum om de uitkering te berekenen."),
        (b.soort === "lijfrente" && pl && pl.maand * 12 > fx(m, pl.start).max_jaaruitkering_tijdelijke_lijfrente_5_20jr && getal(b.looptijd) >= 5 && getal(b.looptijd) <= 20) ? h("p", { className: "oranje klein" }, "Let op: dit is meer dan het fiscale maximum voor een tijdelijke lijfrente van 5 tot 20 jaar (" + eur(fx(m, pl.start).max_jaaruitkering_tijdelijke_lijfrente_5_20jr) + " per jaar). Kies een langere looptijd of controleer de voorwaarden.") : null);
    }
  });
}
function HypotheekForm() {
  var c = useC(), hy = c.S.hyp;
  function z(patch) { c.zet("hyp", patch); }
  if (!c.S.profiel.gebruik.hypotheek) return h("p", { className: "klein" }, "Je hebt aangegeven geen hypotheek te hebben. Zet dit aan bij de basisgegevens op het Dashboard.");
  return h("div", null,
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Openstaand bedrag", value: hy.bedrag, onChange: function (v) { z({ bedrag: v }); }, naam: "hyp-bedrag" }),
      h(BedragVeld, { label: "Rente (%)", value: hy.rente, pct: true, onChange: function (v) { z({ rente: v }); } })),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Maandlast (rente en aflossing)", value: hy.maandlast, onChange: function (v) { z({ maandlast: v }); }, naam: "hyp-maandlast" }),
      h(BedragVeld, { label: "Waarvan aflossing per maand", hint: "Bij aflossingsvrij: 0.", value: hy.aflossing, onChange: function (v) { z({ aflossing: v }); } })),
    h("div", { className: "raster" },
      h(KeuzeVeld, { label: "Aflossingsvorm", value: hy.vorm, opties: [["annuiteit", "Annuïteit"], ["lineair", "Lineair"], ["aflossingsvrij", "Aflossingsvrij"]], onChange: function (v) { z({ vorm: v }); } }),
      h(DatumVeld, { label: "Einde aflossing (daarna aflossingsvrij)", value: hy.aflosEinde, onChange: function (v) { z({ aflosEinde: v }); } })),
    h(DatumVeld, { label: "Einde rentevaste periode", value: hy.renteVastTot, onChange: function (v) { z({ renteVastTot: v }); } }),
    h(Uitleg, null, "Na de einddatum van de aflossing rekent de app met alleen rente over het dan openstaande bedrag."));
}

/* ----- Vaste lasten ----- */
function nieuweLast() { return { id: nieuwId(), naam: "", bedrag: "", freq: "maand", eersteMaand: 1, index: "cpi", indexPct: "", start: "", einde: "" }; }
function foutenLast(b) {
  return leeg([!b.naam ? "Geef elke vaste last een naam." : null, b.bedrag === "" ? (b.naam || "Post") + ": vul een bedrag in." : null, nietNeg(b.bedrag, (b.naam || "Post") + " bedrag"),
    datumFout(b.start, (b.naam || "Post") + " start"), datumFout(b.einde, (b.naam || "Post") + " einde"),
    (geldigeDatum(b.start) && geldigeDatum(b.einde) && geldigeDatum(b.einde) <= geldigeDatum(b.start)) ? (b.naam || "Post") + ": de einddatum moet na de startdatum liggen." : null]);
}
var FREQ_KEUZES = [["maand", "Per maand"], ["kwartaal", "Per kwartaal"], ["halfjaar", "Per half jaar"], ["jaar", "Per jaar"]];
function LastenEditor() {
  var c = useC(), L = c.lijst("lasten");
  return h(LijstEditor, {
    naam: "last", items: L.items, leeg: "Nog geen vaste lasten.", voegTekst: "Vaste last toevoegen",
    kop: function (b) { return (b.naam || "Nieuwe post") + (b.bedrag !== "" ? " · " + eur(b.bedrag) : ""); },
    onVoeg: function () { L.voeg(nieuweLast()); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null,
        h("div", { className: "raster" },
          h(TekstVeld, { label: "Naam", value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "last-naam", placeholder: "bijv. energie, verzekeringen" }),
          h(BedragVeld, { label: "Bedrag per betaling", value: b.bedrag, onChange: function (v) { w({ bedrag: v }); }, naam: "last-bedrag" })),
        h("div", { className: "raster" },
          h(KeuzeVeld, { label: "Hoe vaak", value: b.freq, opties: FREQ_KEUZES, onChange: function (v) { w({ freq: v }); } }),
          b.freq !== "maand" ? h(KeuzeVeld, { label: "Eerste betaling in", value: String(b.eersteMaand || 1), opties: MAANDEN.map(function (n, i) { return [String(i + 1), n]; }), onChange: function (v) { w({ eersteMaand: Number(v) }); } }) : null),
        h("div", { className: "raster" },
          h(KeuzeVeld, { label: "Indexatie", value: b.index, opties: INDEX_KEUZES, onChange: function (v) { w({ index: v }); } }),
          b.index === "vast" ? h(BedragVeld, { label: "Percentage per jaar", value: b.indexPct, pct: true, onChange: function (v) { w({ indexPct: v }); } }) : null),
        h("div", { className: "raster" },
          h(DatumVeld, { label: "Start (leeg = loopt al)", value: b.start, onChange: function (v) { w({ start: v }); } }),
          h(DatumVeld, { label: "Einde (leeg = loopt door)", value: b.einde, onChange: function (v) { w({ einde: v }); } })));
    }
  });
}
function DagelijksVeld() {
  var c = useC();
  return h(BedragVeld, { label: "Dagelijkse uitgaven per maand", hint: "Boodschappen, benzine, kleding, uit eten en alles wat niet in de vaste lasten staat.", value: c.S.dagelijks.bedrag, onChange: function (v) { c.zet("dagelijks", { bedrag: v }); }, naam: "dagelijks" });
}
function cpiBijwerken(c, maand, nieuwPct) {
  // Bedragen met CPI-indexatie worden omgerekend naar het niveau van de gemeten maand; daarna geldt het nieuwe percentage.
  var m = c.m, d = geldigeDatum(maand + "-01");
  if (!d) return;
  var fac = maandFactor(m, "cpi", 0, d);
  c.lijst("lasten").items.forEach(function (p) { if (p.index === "cpi" && p.bedrag !== "") c.lijst("lasten").wijzig(p.id, { bedrag: Math.round(getal(p.bedrag) * fac * 100) / 100 }); });
  if (c.S.dagelijks.bedrag !== "") c.zet("dagelijks", { bedrag: Math.round(getal(c.S.dagelijks.bedrag) * fac * 100) / 100 });
  c.zet("inst", { cpi: nieuwPct, cpiIjk: maand, cpiStand: isoDatum(vandaag()) });
}
function CpiKaart() {
  var c = useC(), i = c.S.inst;
  var s = useState(false), open = s[0], setOpen = s[1];
  var v1 = useState(isoDatum(plusMaanden(vandaag(), -1)).slice(0, 7)), mnd = v1[0], setMnd = v1[1];
  var v2 = useState(""), pctGem = v2[0], setPctGem = v2[1];
  return h("div", null,
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Verwachte inflatie per jaar (CPI, %)", hint: "Wordt per maand omgeslagen: 1/12 van het jaarpercentage per maand.", value: i.cpi, pct: true, onChange: function (v) { c.zet("inst", { cpi: v }); }, naam: "cpi" }),
      h(MaandVeld, { label: "Bedragen gelden op het prijspeil van", hint: "Het ijkpunt: de maand waarop je bedragen kloppen (leeg = de peilmaand).", value: i.cpiIjk, onChange: function (v) { c.zet("inst", { cpiIjk: v }); }, naam: "cpiIjk" })),
    h("p", { className: "klein" }, "CPI laatst gecontroleerd: " + (i.cpiStand ? fmtDatum(i.cpiStand) : "nog niet") + ". Bron: CBS (cbs.nl, inflatie per maand)."),
    h("div", { className: "rij" },
      h(Knop, { soort: "sec", klein: true, onClick: function () { c.zet("inst", { cpiStand: isoDatum(vandaag()) }); }, naam: "cpi-gecontroleerd" }, "CPI is vandaag gecontroleerd"),
      h(Knop, { soort: "sec", klein: true, onClick: function () { setOpen(!open); }, naam: "cpi-update" }, "CPI bijwerken met gemeten waarde")),
    open ? h("div", { className: "kaart info", style: { marginTop: ".5rem" } },
      h(MaandVeld, { label: "Gemeten maand", value: mnd, onChange: setMnd, naam: "cpi-maand" }),
      h(BedragVeld, { label: "Gemeten inflatie (% jaar op jaar)", value: pctGem, pct: true, onChange: setPctGem, naam: "cpi-gemeten" }),
      h(Uitleg, null, "Bedragen met CPI-indexatie (vaste lasten en dagelijkse uitgaven) worden omgerekend naar het prijspeil van deze maand. Daarna geldt dit percentage voor de toekomst."),
      h(Knop, { disabled: pctGem === "", onClick: function () { cpiBijwerken(c, mnd, pctGem); setOpen(false); }, naam: "cpi-toepassen" }, "Toepassen")) : null);
}

/* ----- Vermogen ----- */
function SpaarVeld() {
  var c = useC(), v = c.S.verm, i = c.S.inst;
  return h("div", null,
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Spaargeld (direct opneembaar)", hint: "Alles wat je zo kunt opnemen, zonder deposito's.", value: v.spaar, onChange: function (x) { c.zet("verm", { spaar: x }); }, naam: "spaar" }),
      h(BedragVeld, { label: "Spaarrente per jaar (%)", value: i.spaarrente, pct: true, onChange: function (x) { c.zet("inst", { spaarrente: x }); }, naam: "spaarrente" })),
    h("div", { className: "rij" },
      h("span", { className: "klein" }, "Rente gecontroleerd op: " + (i.spaarrenteStand ? fmtDatum(i.spaarrenteStand) : "nog niet") + ". Bron: je bank of Raisin."),
      h(Knop, { soort: "sec", klein: true, onClick: function () { c.zet("inst", { spaarrenteStand: isoDatum(vandaag()) }); }, naam: "rente-gecontroleerd" }, "Vandaag gecontroleerd")));
}
function nieuwDeposito() { return { id: nieuwId(), naam: "", bedrag: "", rente: "", start: "", looptijd: "", eind: "", uitkering: "einde", reedsUitgekeerd: "" }; }
function foutenDeposito(d) {
  var n = d.naam || "Deposito";
  return leeg([!d.naam ? "Geef elk deposito een naam." : null, getal(d.bedrag) <= 0 ? n + ": vul een bedrag in." : null, d.rente === "" ? n + ": vul de rente in." : null, nietNeg(d.rente, n + " rente"),
    !geldigeDatum(d.start) ? n + ": vul een geldige startdatum in." : null, !geldigeDatum(d.eind) ? n + ": vul een looptijd of einddatum in." : null,
    (geldigeDatum(d.start) && geldigeDatum(d.eind) && geldigeDatum(d.eind) <= geldigeDatum(d.start)) ? n + ": de einddatum moet na de startdatum liggen." : null]);
}
function DepositoEditor() {
  var c = useC(), L = c.lijst("verm", "deposito"), m = c.m;
  if (!c.S.profiel.gebruik.deposito) return h("p", { className: "klein" }, "Je hebt aangegeven geen deposito's te hebben.");
  return h("div", null,
    h(LijstEditor, {
      naam: "deposito", items: L.items, leeg: "Nog geen deposito's.", voegTekst: "Deposito toevoegen",
      kop: function (d) { return (d.naam || "Nieuw deposito") + (d.bedrag !== "" ? " · " + eur(d.bedrag) : ""); },
      onVoeg: function () { L.voeg(nieuwDeposito()); }, onWis: L.wis, onWijzig: L.wijzig,
      velden: function (d, w) {
        var pl = depositoPlan(m, d);
        return h("div", null,
          h("div", { className: "raster" },
            h(TekstVeld, { label: "Naam (bijv. bank)", value: d.naam, onChange: function (v) { w({ naam: v }); }, naam: "dep-naam" }),
            h(BedragVeld, { label: "Bedrag", value: d.bedrag, onChange: function (v) { w({ bedrag: v }); }, naam: "dep-bedrag" })),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Rente per jaar (%)", value: d.rente, pct: true, onChange: function (v) { w({ rente: v }); }, naam: "dep-rente" }),
            h(DatumVeld, { label: "Startdatum", hint: "Ligt de start in de toekomst, dan gaat het bedrag op die dag van je spaarrekening af.", value: d.start, onChange: function (v) { var gd = geldigeDatum(v); w({ start: v, eind: gd && getal(d.looptijd) > 0 ? isoDatum(plusMaanden(gd, Math.round(getal(d.looptijd)))) : d.eind }); }, naam: "dep-start" })),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Looptijd (maanden)", value: d.looptijd, pct: true, onChange: function (v) { var gd = geldigeDatum(d.start); w({ looptijd: v, eind: gd && getal(v) > 0 ? isoDatum(plusMaanden(gd, Math.round(getal(v)))) : d.eind }); }, naam: "dep-looptijd" }),
            h(DatumVeld, { label: "Einddatum", value: d.eind, onChange: function (v) { var gs = geldigeDatum(v), g0 = geldigeDatum(d.start); w({ eind: v, looptijd: gs && g0 ? maandenTussen(g0, gs) : d.looptijd }); }, naam: "dep-eind" })),
          h("div", { className: "raster" },
            h(KeuzeVeld, { label: "Rente wordt uitgekeerd", value: d.uitkering, opties: [["einde", "Aan het einde van de looptijd"], ["jaarlijks", "Elk jaar"]], onChange: function (v) { w({ uitkering: v }); }, naam: "dep-uitkering" }),
            h(BedragVeld, { label: "Al uitgekeerde rente (eenmalig)", hint: "Alleen invullen als rente al is bijgeschreven. Wordt van de eindrente afgetrokken.", value: d.reedsUitgekeerd, onChange: function (v) { w({ reedsUitgekeerd: v }); } })),
          pl ? h("p", { className: "klein" }, "Eindigt op " + fmtDatum(pl.eind) + ". Verwachte rente: " + eur(pl.totaleRente) + " (" + (d.uitkering === "jaarlijks" ? "jaarlijks uitgekeerd" : "bij einde looptijd") + "). Bij vrijval gaat alles naar je spaarrekening.") : null,
          pl && pl.eind <= m.peil ? h("p", { className: "rood klein" }, "Dit deposito is verlopen. Boek het bedrag over naar je spaarrekening en werk de spaarrekening bij; verwijder dan dit deposito of pas de data aan.") : null);
      }
    }),
    h(Uitleg, null, "Verlengen of een nieuw deposito afsluiten doe je zelf, vanaf de spaarrekening: voeg dan hier een nieuw deposito toe met de startdatum. De app verlengt nooit automatisch."));
}
function BeleggingenEditor() {
  var c = useC(), L = c.lijst("verm", "beleggingen");
  if (!c.S.profiel.gebruik.beleggen) return h("p", { className: "klein" }, "Je hebt aangegeven geen beleggingen te hebben.");
  return h(LijstEditor, {
    naam: "belegging", items: L.items, leeg: "Nog geen beleggingsrekeningen.", voegTekst: "Beleggingsrekening toevoegen",
    kop: function (b) { return (b.naam || "Nieuwe rekening") + (b.waarde !== "" ? " · " + eur(b.waarde) : ""); },
    onVoeg: function () { L.voeg({ id: nieuwId(), naam: "", waarde: "", soort: "vrij" }); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", { className: "raster" },
        h(TekstVeld, { label: "Naam of rekening", value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "bel-naam" }),
        h(BedragVeld, { label: "Waarde nu", value: b.waarde, onChange: function (v) { w({ waarde: v }); }, naam: "bel-waarde" }),
        h(KeuzeVeld, { label: "Soort", hint: "Vrij beleggen telt mee in het beleggingsadvies. Pensioenbeleggingen niet.", value: b.soort, opties: [["vrij", "Vrij beleggen"], ["pensioen", "Pensioen of lijfrente (geblokkeerd)"]], onChange: function (v) { w({ soort: v }); }, naam: "bel-soort" }));
    }
  });
}
function OverigEditor() {
  var c = useC(), L = c.lijst("verm", "overig");
  return h(LijstEditor, {
    naam: "overig", items: L.items, leeg: "Geen overige bezittingen.", voegTekst: "Bezitting toevoegen",
    kop: function (b) { return (b.naam || "Nieuwe bezitting") + (b.waarde !== "" ? " · " + eur(b.waarde) : ""); },
    onVoeg: function () { L.voeg({ id: nieuwId(), naam: "", waarde: "", box3: false }); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null, h("div", { className: "raster" },
        h(TekstVeld, { label: "Naam", value: b.naam, onChange: function (v) { w({ naam: v }); }, placeholder: "bijv. woning, auto" }),
        h(BedragVeld, { label: "Waarde", value: b.waarde, onChange: function (v) { w({ waarde: v }); } })),
        h(Vink, { label: "Telt mee in box 3 (niet je eigen woning)", value: !!b.box3, onChange: function (v) { w({ box3: v }); } }));
    }
  });
}
function SchuldenEditor() {
  var c = useC(), L = c.lijst("verm", "schulden");
  return h(LijstEditor, {
    naam: "schuld", items: L.items, leeg: "Geen schulden of uitstaande leningen.", voegTekst: "Schuld of lening toevoegen",
    kop: function (b) { return (b.naam || "Nieuw") + (b.bedrag !== "" ? " · " + eur(b.bedrag) : ""); },
    onVoeg: function () { L.voeg({ id: nieuwId(), naam: "", bedrag: "", soort: "schuld" }); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", { className: "raster" },
        h(TekstVeld, { label: "Naam", value: b.naam, onChange: function (v) { w({ naam: v }); } }),
        h(BedragVeld, { label: "Bedrag", value: b.bedrag, onChange: function (v) { w({ bedrag: v }); } }),
        h(KeuzeVeld, { label: "Soort", hint: "Vreemd vermogen telt niet mee in je vrije vermogen.", value: b.soort, opties: [["schuld", "Ik ben het schuldig"], ["uitstaand", "Ik heb het uitgeleend (bijv. aan kinderen)"]], onChange: function (v) { w({ soort: v }); } }));
    }
  });
}
function SnelBeschikbaarVelden() {
  var c = useC(), i = c.S.inst;
  return h("div", null,
    h(Vink, { label: "Deposito's die snel vrijvallen tellen mee als 'snel beschikbaar'", value: i.kortMee, onChange: function (v) { c.zet("inst", { kortMee: v }); } }),
    h(BedragVeld, { label: "Termijn snel beschikbaar (maanden)", hint: "Deposito's met een restlooptijd tot en met dit aantal maanden tellen mee.", value: i.kortMaanden, pct: true, onChange: function (v) { c.zet("inst", { kortMaanden: v }); }, naam: "kortMaanden" }));
}

/* ----- Grote posten ----- */
function nieuweReservering() { return { id: nieuwId(), naam: "", maand: "", dag: 22, start: "", einde: "", startsaldo: "" }; }
function ReserveringenEditor() {
  var c = useC(), L = c.lijst("grote", "reserveringen");
  return h(LijstEditor, {
    naam: "reservering", items: L.items, leeg: "Nog geen reserveringen.", voegTekst: "Reservering toevoegen",
    kop: function (r) { return (r.naam || "Nieuwe reservering") + (r.maand !== "" ? " · " + eur(r.maand) + " per maand" : ""); },
    onVoeg: function () { L.voeg(nieuweReservering()); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (r, w) {
      return h("div", null,
        h("div", { className: "raster" },
          h(TekstVeld, { label: "Naam", value: r.naam, onChange: function (v) { w({ naam: v }); }, naam: "res-naam", placeholder: "bijv. vakantie, auto" }),
          h(BedragVeld, { label: "Bedrag per maand", value: r.maand, onChange: function (v) { w({ maand: v }); }, naam: "res-maand" })),
        h("div", { className: "raster3" },
          h(BedragVeld, { label: "Boekdag (1 tot 28)", value: r.dag, pct: true, max: 28, onChange: function (v) { w({ dag: v }); } }),
          h(BedragVeld, { label: "Saldo nu in deze pot", value: r.startsaldo, onChange: function (v) { w({ startsaldo: v }); } }),
          h(DatumVeld, { label: "Stopt per (leeg = loopt door)", value: r.einde, onChange: function (v) { w({ einde: v }); } })),
        h(Uitleg, null, "Het maandbedrag gaat automatisch op de boekdag van je spaarrekening naar deze pot en telt als last. Opnames geef je zelf aan bij 'Geplande boekingen'."));
    }
  });
}
function nieuweBoeking() { return { id: nieuwId(), datum: "", omschrijving: "", type: "uitgave", bedrag: "", reserveringId: "", herhaal: "geen", tot: "" }; }
function foutenBoeking(b) {
  var n = b.omschrijving || "Boeking";
  return leeg([!b.omschrijving ? "Geef elke boeking een omschrijving." : null, !geldigeDatum(b.datum) ? n + ": vul een geldige datum in." : null, getal(b.bedrag) <= 0 ? n + ": vul een bedrag in (groter dan 0)." : null]);
}
function BoekingenEditor() {
  var c = useC(), L = c.lijst("grote", "boekingen"), res = c.S.grote.reserveringen || [];
  return h(LijstEditor, {
    naam: "boeking", items: L.items, leeg: "Nog geen geplande grote inkomsten of uitgaven.", voegTekst: "Boeking toevoegen",
    kop: function (b) { return (b.omschrijving || "Nieuwe boeking") + (b.bedrag !== "" ? " · " + (b.type === "inkomst" ? "+" : "-") + eur(b.bedrag).replace("€ ", "€ ") : ""); },
    onVoeg: function () { L.voeg(nieuweBoeking()); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null,
        h("div", { className: "raster" },
          h(TekstVeld, { label: "Omschrijving", value: b.omschrijving, onChange: function (v) { w({ omschrijving: v }); }, naam: "boek-omschrijving" }),
          h(KeuzeVeld, { label: "Soort", value: b.type, opties: [["uitgave", "Uitgave"], ["inkomst", "Inkomst"]], onChange: function (v) { w({ type: v }); }, naam: "boek-type" })),
        h("div", { className: "raster" },
          h(DatumVeld, { label: "Datum", value: b.datum, onChange: function (v) { w({ datum: v }); }, naam: "boek-datum" }),
          h(BedragVeld, { label: "Bedrag", value: b.bedrag, onChange: function (v) { w({ bedrag: v }); }, naam: "boek-bedrag" })),
        h("div", { className: "raster" },
          h(KeuzeVeld, { label: "Herhaling", value: b.herhaal, opties: [["geen", "Eenmalig"], ["jaarlijks", "Elk jaar"]], onChange: function (v) { w({ herhaal: v }); } }),
          b.herhaal === "jaarlijks" ? h(DatumVeld, { label: "Laatste keer (leeg = doorlopend)", value: b.tot, onChange: function (v) { w({ tot: v }); } }) : null),
        (b.type === "uitgave" && res.length) ? h(KeuzeVeld, { label: "Betalen uit reservering", hint: "Kies een reservering als dit een opname uit die pot is. Je spaarrekening blijft dan ongemoeid.", value: b.reserveringId || "", opties: [["", "Nee, van de spaarrekening"]].concat(res.map(function (r) { return [r.id, r.naam || "Reservering"]; })), onChange: function (v) { w({ reserveringId: v }); } }) : null);
    }
  });
}
function MinimumVeld() {
  var c = useC();
  return h(BedragVeld, { label: "Minimaal spaargeld (buffer)", hint: "Onder dit bedrag wil je niet komen.", value: c.S.grote.minimum, onChange: function (v) { c.zet("grote", { minimum: v }); }, naam: "minimum" });
}

/* ----- Inkomensaanvulling ----- */
function foutenAanv(a) {
  return leeg([getal(a.startsaldo) <= 0 ? "Vul het saldo van de pot in." : null, a.opnameAan && getal(a.maand) <= 0 ? "Vul het bedrag in dat je per maand opneemt (of zet de opname uit)." : null,
    datumFout(a.opnameVanaf, "Opname vanaf"), datumFout(a.einde, "Einde opname"), nietNeg(a.rendement, "Rendement") && null]);
}
function AanvulVelden() {
  var c = useC(), a = c.S.aanv;
  function z(patch) { c.zet("aanv", patch); }
  return h("div", null,
    h(TekstVeld, { label: "Naam van de pot", value: a.naam, onChange: function (v) { z({ naam: v }); } }),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Saldo nu", value: a.startsaldo, onChange: function (v) { z({ startsaldo: v }); }, naam: "aanv-saldo" }),
      h(BedragVeld, { label: "Opname per maand (netto)", value: a.maand, onChange: function (v) { z({ maand: v }); }, naam: "aanv-maand" })),
    h(Vink, { label: "Opname staat aan", value: a.opnameAan, onChange: function (v) { z({ opnameAan: v }); } }),
    h("div", { className: "raster" },
      h(DatumVeld, { label: "Opname vanaf (leeg = nu)", value: a.opnameVanaf, onChange: function (v) { z({ opnameVanaf: v }); } }),
      h(DatumVeld, { label: "Opname tot (leeg = tot de pot leeg is)", value: a.einde, onChange: function (v) { z({ einde: v }); } })),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Rendement per jaar (%)", value: a.rendement, pct: true, onChange: function (v) { z({ rendement: v }); } }),
      h(BedragVeld, { label: "Beheerkosten per jaar (%)", value: a.kosten, pct: true, onChange: function (v) { z({ kosten: v }); } })));
}
function AanvulMutaties() {
  var c = useC(), L = c.lijst("aanv", "mutaties");
  return h(LijstEditor, {
    naam: "aanvmut", items: L.items, leeg: "Geen geplande stortingen of opnames.", voegTekst: "Bijstorten of afromen toevoegen",
    kop: function (x) { return getal(x.bedrag) >= 0 ? "Bijstorten" : "Afromen"; },
    onVoeg: function () { L.voeg({ id: nieuwId(), datum: "", bedrag: "" }); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (x, w) {
      return h("div", { className: "raster3" },
        h(DatumVeld, { label: "Datum", value: x.datum, onChange: function (v) { w({ datum: v }); } }),
        h(KeuzeVeld, { label: "Soort", value: getal(x.bedrag) < 0 ? "af" : "bij", opties: [["bij", "Bijstorten (van spaarrekening)"], ["af", "Afromen (naar spaarrekening)"]], onChange: function (v) { var b = Math.abs(getal(x.bedrag)); w({ bedrag: v === "af" ? -b : b }); } }),
        h(BedragVeld, { label: "Bedrag", value: Math.abs(getal(x.bedrag)) || "", onChange: function (v) { var neg = getal(x.bedrag) < 0; w({ bedrag: neg ? -getal(v) : getal(v) }); } }));
    }
  });
}
