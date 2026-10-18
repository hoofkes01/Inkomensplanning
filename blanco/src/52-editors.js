/* ===== Invoer-onderdelen die zowel in de menu's als in de intake worden gebruikt ===== */
function persOpties(m) { return m.personen.map(function (p) { return [p.id, p.naam]; }); }
function MaandVeld(p) {
  var s = useState(null), tekst = s[0], setTekst = s[1];
  var m0 = /^(\d{4})-(\d{2})$/.exec(p.value || "");
  var weergave = tekst !== null ? tekst : (m0 ? m0[2] + "-" + m0[1] : "");
  var cijfers = (tekst || "").replace(/\D/g, "");
  var fout = tekst !== null && cijfers.length > 0 ? (cijfers.length < 6 ? "Vul de maand in als maand-jaar, bijvoorbeeld 09-2026." : "Deze maand bestaat niet.") : "";
  return h(Veld, { label: p.label, hint: p.hint, fout: p.fout || fout },
    h("input", { type: "text", inputMode: "numeric", placeholder: "mm-jjjj", autoComplete: "off", maxLength: 7, value: weergave, "data-veld": p.naam,
      onChange: function (e) {
        var c = e.target.value.replace(/\D/g, "").slice(0, 6);
        if (c.length === 0) { setTekst(null); p.onChange(""); return; }
        if (c.length === 6 && Number(c.slice(0, 2)) >= 1 && Number(c.slice(0, 2)) <= 12) { setTekst(null); p.onChange(c.slice(2) + "-" + c.slice(0, 2)); return; }
        setTekst(maskCijfers(c, [2, 4]));
      } }));
}
function datumFout(w, label) { return w && !geldigeDatum(w) ? label + ": datum is niet geldig." : null; }
function nietNeg(w, label) { return w !== "" && w != null && getal(w) < 0 ? label + ": mag niet negatief zijn." : null; }
function leeg(a) { return a.filter(function (x) { return x; }); }
function maakLabel(m, pid) { return persoonVan(m, pid).naam; }

/* ----- Huishouden en persoonlijke situatie (algemene intake) ----- */
function zetHuishouden(c, type) {
  var lab = labelsVoorType(type);
  c.zet("profiel", { type: type, partner: lab.length === 2, naamA: lab[0], naamB: lab[1] || "Persoon B" });
}
function HuishoudenKeuze() {
  var c = useC(), p = c.S.profiel, rn = useState(function () { return "hh" + nieuwId(); })[0];
  return h("div", null,
    h("div", { role: "radiogroup", "aria-label": "Samenstelling huishouden" }, HUISHOUDENS.map(function (x) {
      return h("label", { key: x[0], className: "vink", style: { padding: ".35rem .5rem", border: "1px solid #e2e8f0", borderRadius: ".6rem", background: p.type === x[0] ? "#f1f5f9" : "#fff" } },
        h("input", { type: "radio", name: rn, checked: p.type === x[0], onChange: function () { zetHuishouden(c, x[0]); }, "data-huishouden": x[0] }), h("span", null, x[1]));
    })),
    p.partner ? h(Vink, { label: "We zijn gehuwd of wonen samen als partners (fiscale partners)", hint: "Dit bepaalt onder andere de hoogte van de AOW. Vink uit als jullie een huis delen zonder partners te zijn.", value: p.fiscalePartners !== false, onChange: function (v) { c.zet("profiel", { fiscalePartners: v }); } }) : null,
    h(Uitleg, null, "Je kunt de planning voor jezelf alleen maken, of samen met een tweede persoon. Elke volwassene kan een eigen planning maken."));
}
function GeboorteVelden() {
  var c = useC(), p = c.S.profiel, m = c.m;
  return h("div", { className: "raster" },
    h(DatumVeld, { label: "Geboortedatum " + m.personen[0].naam, value: p.geboorteA, onChange: function (v) { c.zet("profiel", { geboorteA: v }); }, naam: "geboorteA" }),
    p.partner ? h(DatumVeld, { label: "Geboortedatum " + (m.personen[1] ? m.personen[1].naam : "persoon 2"), value: p.geboorteB, onChange: function (v) { c.zet("profiel", { geboorteB: v }); }, naam: "geboorteB" }) : null);
}
function BasisGegevens() { return h("div", null, h(HuishoudenKeuze, null), h(GeboorteVelden, null)); }
function AnoniemInfo() {
  var c = useC();
  return h("div", null,
    h("div", { className: "kaart info" },
      h("b", null, "Deze app is anoniem"),
      h("ul", { className: "lijst" },
        h("li", null, "Geen naam, BSN, adres, postcode, telefoonnummer of e-mailadres."),
        h("li", null, "Geen rekeningnummers (IBAN). Alleen de naam van de bank en de soort rekening."),
        h("li", null, "Personen heten 'Man', 'Vrouw', 'Man 1', 'Vrouw 2' enzovoort. Alle lasten hebben een neutrale omschrijving."),
        h("li", null, "Alles blijft op dit apparaat, in deze browser. Er gaat niets naar een server."))),
    h(Vink, { label: "Ik begrijp dit en vul geen persoonsgegevens in", value: c.S.profiel.akkoordAnoniem, onChange: function (v) { c.zet("profiel", { akkoordAnoniem: v }); } }),
    h(Uitleg, null, "De app weigert tekst die lijkt op een e-mailadres, postcode, telefoonnummer, rekeningnummer of adres."));
}
function WerkStatusVelden() {
  var c = useC(), m = c.m, w = c.S.profiel.werk || { A: [], B: [] };
  return h("div", null, m.personen.map(function (p) {
    var sel = w[p.id] || [];
    return h("div", { key: p.id, className: "kaart", style: { background: "#f8fafc" } },
      h("b", null, p.naam), h(Uitleg, null, "Kies alles wat past; de app laat daarna alleen daarbij horende onderdelen zien."),
      WERKSTATUS.map(function (x) {
        return h(Vink, { key: x[0], label: x[1], value: sel.indexOf(x[0]) >= 0, onChange: function (v) {
          var nieuw = sel.filter(function (y) { return y !== x[0]; });
          if (v) { if (x[0] === "geen") nieuw = ["geen"]; else nieuw = nieuw.filter(function (y) { return y !== "geen"; }).concat([x[0]]); }
          c.zetPad("profiel", ["werk", p.id], nieuw);
        } });
      }));
  }));
}
function WoningVelden() {
  var c = useC(), l = c.S.profiel.leef || {}, rn = useState(function () { return "wn" + nieuwId(); })[0];
  function z(patch) { c.zetPad("profiel", ["leef"], Object.assign({}, l, patch)); }
  function kies(w) { z({ woning: w }); c.zetPad("profiel", ["gebruik", "hypotheek"], w === "koop"); }
  var opties = [["huur", "Ik huur een woning"], ["koop", "Ik woon in een koopwoning (eigen huis)"], ["geen", "Ik heb geen eigen woning (inwonend, kamer of anders)"]];
  return h("div", null,
    opties.map(function (x) {
      return h("label", { key: x[0], className: "vink", style: { padding: ".35rem .5rem", border: "1px solid #e2e8f0", borderRadius: ".6rem", background: l.woning === x[0] ? "#f1f5f9" : "#fff" } },
        h("input", { type: "radio", name: rn, checked: l.woning === x[0], onChange: function () { kies(x[0]); }, "data-woning": x[0] }), h("span", null, x[1]));
    }),
    l.woning === "koop" ? h("div", null, h(BedragVeld, { label: "WOZ-waarde van de woning", hint: "Staat op je WOZ-beschikking. Telt mee in je totale vermogen, niet in je vrije vermogen.", value: l.woz, onChange: function (v) { z({ woz: v }); }, naam: "woz" }),
      h(Uitleg, null, "Bij een koopwoning vraagt de app straks naar je hypotheek. De hypotheekrenteaftrek zit niet in de berekening: vul bij je inkomen het netto in dat je werkelijk ontvangt.")) : null,
    l.woning === "huur" ? h(Uitleg, null, "Bij een huurwoning vraagt de app naar je huur en servicekosten, en of je huurtoeslag ontvangt.") : null,
    l.woning === "geen" ? h(Uitleg, null, "Je kunt later een bijdrage voor woonkosten opgeven als je die betaalt.") : null);
}
function AutoVelden() {
  var c = useC(), l = c.S.profiel.leef || {};
  function z(patch) { c.zetPad("profiel", ["leef"], Object.assign({}, l, patch)); }
  var tel = [["", "Kies"], ["0", "Geen"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]];
  var eigen = l.eigen !== undefined && l.eigen !== "" ? String(l.eigen) : "", lease = l.lease !== undefined && l.lease !== "" ? String(l.lease) : "";
  return h("div", null,
    h("div", { className: "raster" },
      h(KeuzeVeld, { label: "Aantal eigen auto's", value: eigen, opties: tel, onChange: function (v) { z({ eigen: v === "" ? "" : Number(v), auto: "" }); }, naam: "auto-eigen" }),
      h(KeuzeVeld, { label: "Aantal leaseauto's", value: lease, opties: tel, onChange: function (v) { z({ lease: v === "" ? "" : Number(v), auto: "" }); }, naam: "auto-lease" })),
    h(Vink, { label: "We gebruiken een deelauto of nemen regelmatig een taxi", value: !!l.deel, onChange: function (v) { z({ deel: v }); } }),
    h(Uitleg, null, "Kies 'Geen' bij beide als je geen auto hebt. Per auto vraagt de app later naar verzekering, belasting, brandstof en onderhoud (eigen auto) of de leasetermijn (leaseauto)."));
}
function GezinVelden() {
  var c = useC(), p = c.S.profiel, l = p.leef || {}, kids = p.kids || [];
  function zetKids(nieuw) {
    var patch = { kids: nieuw, leef: Object.assign({}, l, { kinderen: nieuw.length, opvang: nieuw.some(function (k) { return k.opvang; }), studerend: nieuw.some(function (k) { return k.studerend; }) }) };
    c.zet("profiel", patch);
  }
  function zetAantal(n) {
    n = Math.max(0, Math.min(12, Math.round(getal(n))));
    var nieuw = kids.slice(0, n);
    while (nieuw.length < n) nieuw.push({ id: nieuwId(), geboorte: "", opvang: false, studerend: false, beperking: false });
    zetKids(nieuw);
  }
  function wijzigKind(id, patch) { zetKids(kids.map(function (k) { return k.id === id ? Object.assign({}, k, patch) : k; })); }
  return h("div", null,
    h(BedragVeld, { label: "Aantal kinderen dat (deels) van je afhankelijk is", hint: "0 als er geen zijn. De geboortedatum van elk kind bepaalt de kinderbijslag en de duur van de kinderopvang. Alleen de datum, geen naam.", value: kids.length, onChange: zetAantal, naam: "kinderen", max: 12 }),
    kids.map(function (k, i) {
      return h("div", { key: k.id, className: "kaart", style: { background: "#f8fafc" }, "data-kind": i + 1 },
        h("b", null, "Kind " + (i + 1)),
        h(DatumVeld, { label: "Geboortedatum kind " + (i + 1), value: k.geboorte, onChange: function (v) { wijzigKind(k.id, { geboorte: v }); }, naam: "kind-geboorte" + (i + 1) }),
        h(Vink, { label: "Dit kind gaat naar kinderopvang of buitenschoolse opvang", value: !!k.opvang, onChange: function (v) { wijzigKind(k.id, { opvang: v }); } }),
        h(Vink, { label: "Dit kind studeert", value: !!k.studerend, onChange: function (v) { wijzigKind(k.id, { studerend: v }); } }),
        h(Vink, { label: "Dit kind heeft een beperking met intensieve zorg", hint: "Bijvoorbeeld met een Wlz-indicatie of positief CIZ-advies en minstens 4 nachten per week thuis. De app rekent dan dubbele kinderbijslag (3 tot en met 17 jaar) en biedt extra toeslagen en kosten aan. Controleer de voorwaarden bij de SVB.", value: !!k.beperking, onChange: function (v) { wijzigKind(k.id, { beperking: v }); }, naam: "beperking" + (i + 1) }));
    }),
    kids.length ? h(KinderbijslagKeuze, null) : null,
    h(Vink, { label: "We hebben een huisdier", value: !!l.huisdier, onChange: function (v) { c.zetPad("profiel", ["leef"], Object.assign({}, l, { huisdier: v })); } }));
}
// Kinderbijslag: de app rekent hem uit met de geboortedatum van elk kind; de gebruiker bevestigt, vult zelf in of geeft aan dat er geen is.
function KinderbijslagKeuze() {
  var c = useC(), m = c.m, p = c.S.profiel, L = c.lijst("bronnen"), kids = p.kids || [], LL = lijstL(p);
  var rn = useState(function () { return "kb" + nieuwId(); })[0];
  if (!kids.length) return null;
  var modus = LL.kbModus;
  var rijen = kids.map(function (k, i) {
    var g = geldigeDatum(k.geboorte), l = kinderbijslagLaatsteKwartaalEind(k.geboorte);
    return ["Kind " + (i + 1) + (k.beperking ? " (dubbel)" : ""), g ? leeftijdJaren(g, m.peil) + " jaar" : "–", g ? eur(kinderbijslagKwartaal(m, k.geboorte, kwartaalStart(m.peil), k.beperking)) : "–", l ? fmtMaand(l) : "–"];
  });
  var totaal = kids.reduce(function (s, k) { return s + kinderbijslagKwartaal(m, k.geboorte, kwartaalStart(m.peil), k.beperking); }, 0);
  var manueel = p.kinderbijslagModus === "zelf" ? L.items.filter(function (b) { return b.code === "kinderbijslag"; })[0] : null;
  function kies(v) {
    c.zet("profiel", { kinderbijslagModus: v, kinderbijslagAuto: v === "auto" });
    var bestaand = L.items.filter(function (b) { return b.code === "kinderbijslag"; });
    if (v === "zelf" && !bestaand.length) L.voeg(nieuweBron("A", bronCat("kinderbijslag"), m));
    if (v !== "zelf") bestaand.forEach(function (b) { L.wis(b.id); });
  }
  return h("div", { className: "kaart", style: { background: "#f8fafc" }, "data-kinderbijslag": "1" },
    h("b", null, "Kinderbijslag"),
    modus === "auto" ? h("div", null,
      h(Tabel, { kop: ["Kind", "Leeftijd", "Per kwartaal", "Laatste kwartaal"], get: [1, 2], rijen: rijen.concat([{ klasse: "totaal", cellen: ["Samen", "", eur(totaal), ""] }]) }),
      h("p", { className: "klein" }, "Bedragen van de SVB per kind, achteraf betaald (januari, april, juli, oktober). Gemiddeld circa " + eur(totaal / 3) + " per maand. Het bedrag stijgt in het kwartaal waarin je kind 6 en 12 wordt en stopt als je kind op de eerste dag van een kwartaal 18 is.")) : null,
    [["auto", "Bereken de kinderbijslag automatisch (aanbevolen)"], ["zelf", "Ik vul het bedrag zelf in"], ["geen", "Ik ontvang geen kinderbijslag"]].map(function (o) {
      return h("label", { key: o[0], className: "vink" }, h("input", { type: "radio", name: rn, checked: modus === o[0], onChange: function () { kies(o[0]); }, "data-kb-modus": o[0] }), h("span", null, o[1]));
    }),
    manueel ? h("div", null,
      h(BedragVeld, { label: "Bedrag per betaling (kinderbijslag)", value: manueel.netto, onChange: function (v) { L.wijzig(manueel.id, { netto: v, bruto: "" }); }, naam: "kb-bedrag" }),
      h(KeuzeVeld, { label: "Hoe vaak ontvangen", value: manueel.freq || "kwartaal", opties: FREQ_KEUZES, onChange: function (v) { L.wijzig(manueel.id, { freq: v }); } })) : null);
}
function foutenKinderen(c) {
  var uit = [], nu = c.m.nu;
  (c.S.profiel.kids || []).forEach(function (k, i) {
    var d = geldigeDatum(k.geboorte);
    if (!d) uit.push("Vul de geboortedatum van kind " + (i + 1) + " in.");
    else if (d > nu) uit.push("De geboortedatum van kind " + (i + 1) + " ligt in de toekomst.");
    else if (leeftijdJaren(d, nu) > 30) uit.push("Controleer de geboortedatum van kind " + (i + 1) + ".");
  });
  return uit;
}
function kindEindDefaults(m) {
  var kids = (m.profiel.kids || []), max = function (arr) { var r = null; arr.forEach(function (d) { if (d && (!r || d > r)) r = d; }); return r; };
  return {
    opvang: max(kids.filter(function (k) { return k.opvang; }).map(function (k) { return bsoEindeDatum(k.geboorte); })),
    kgb: max(kids.map(function (k) { var g = geldigeDatum(k.geboorte); return g ? plusJaren(g, 18) : null; }))
  };
}
// Welke onderdelen wil je gebruiken? Niet gekozen onderdelen verdwijnen uit beeld en zijn later toe te voegen.
function ProductenVelden() {
  var c = useC(), g = c.S.profiel.gebruik, hyp = c.S.profiel.leef && c.S.profiel.leef.woning === "koop";
  function z(k, v) { c.zetPad("profiel", ["gebruik", k], v); }
  return h("div", null,
    h(Uitleg, null, "Spaargeld heeft iedereen. Kies hieronder wat voor jou van toepassing is. Wat je niet kiest, zie je niet. Je kunt het later altijd toevoegen."),
    h(Vink, { label: "Ik heb deposito's (of wil daarmee beginnen)", value: g.deposito, onChange: function (v) { z("deposito", v); } }),
    h(Vink, { label: "Ik heb beleggingen (of wil daarmee beginnen)", value: g.beleggen, onChange: function (v) { z("beleggen", v); } }),
    h(Vink, { label: "Ik heb een lijfrente of pensioenpot die ik zelf opneem", value: g.pensioen, onChange: function (v) { z("pensioen", v); } }),
    h(Vink, { label: "Ik heb een pot die mijn inkomen tot de AOW aanvult", value: g.aanvulling, onChange: function (v) { z("aanvulling", v); } }),
    hyp ? h(Uitleg, null, "Hypotheek: je hebt een koopwoning, dus de app vraagt later naar je hypotheek.") : null);
}
function GebruikSchakelaars() { return h(ProductenVelden, null); }
function UitbreidenKaart() {
  var c = useC(), g = c.S.profiel.gebruik;
  var knoppen = [["deposito", "Beginnen met deposito's", "vermogen"], ["beleggen", "Beginnen met beleggen", "advies"], ["aanvulling", "Inkomensaanvulling toevoegen", "aanvulling"], ["pensioen", "Lijfrente of pensioenpot toevoegen", "pensioen"]].filter(function (x) { return !g[x[0]]; });
  if (!knoppen.length) return null;
  return h(Kaart, { titel: "Uitbreiden" }, h(Uitleg, null, "Iets dat nu niet bij je past, maar waar je mee wilt beginnen? Zet het hier aan; de app stelt dan een paar vragen."),
    h("div", { className: "rij" }, knoppen.map(function (x) {
      return h(Knop, { key: x[0], soort: "sec", klein: true, naam: "start-" + x[0], onClick: function () { c.zetPad("profiel", ["gebruik", x[0]], true); c.nav(x[2]); c.openIntake(x[2]); } }, x[1]);
    })));
}
function AowKaart() {
  var c = useC(), p = c.S.profiel, m = c.m;
  function rij(i, geb, aowKey) {
    var pers = m.personen[i]; if (!pers) return null;
    var ber = aowDatumBerekend(geb), tekst = aowLeeftijdTekst(geb), status = aowStatusTekst(geb, m.nu);
    return h("div", { key: i, className: "kaart", style: { background: "#f8fafc" } },
      h("b", null, pers.naam),
      geb ? h("p", { className: "klein" }, "AOW-leeftijd " + tekst + ": AOW-datum " + fmtDatum(ber) + ". " + status) : h("p", { className: "klein" }, "Vul eerst de geboortedatum in."),
      h(DatumVeld, { label: "AOW-datum aanpassen (leeg = berekende datum)", value: p[aowKey], onChange: function (v) { var o = {}; o[aowKey] = v; c.zet("profiel", o); }, naam: aowKey }));
  }
  return h("div", null, rij(0, p.geboorteA, "aowA"), p.partner ? rij(1, p.geboorteB, "aowB") : null);
}
function PeildatumVeld() {
  var c = useC();
  return h(DatumVeld, { label: "Peildatum (leeg = vandaag)", hint: "Alle bedragen die je invult gelden op deze datum. Laat leeg om altijd met vandaag te rekenen.", value: c.S.profiel.peildatum, onChange: function (v) { c.zet("profiel", { peildatum: v }); }, naam: "peildatum" });
}
function foutenAlgemeen(c) {
  var p = c.S.profiel, uit = [], nu = c.m.nu;
  if (!p.type) uit.push("Kies de samenstelling van je huishouden.");
  [["geboorteA", c.m.personen[0].naam]].concat(p.partner ? [["geboorteB", c.m.personen[1].naam]] : []).forEach(function (x) {
    var d = geldigeDatum(p[x[0]]);
    if (!d) uit.push("Vul de geboortedatum van " + x[1] + " in. Die is nodig voor de AOW-datum.");
    else if (d > nu) uit.push("De geboortedatum van " + x[1] + " ligt in de toekomst.");
    else if (leeftijdJaren(d, nu) < 18) uit.push(x[1] + " is jonger dan 18. De app is voor volwassenen.");
    else if (leeftijdJaren(d, nu) > 110) uit.push("Controleer de geboortedatum van " + x[1] + ".");
  });
  return uit;
}

/* ----- Inkomensbronnen: vaste omschrijvingen ----- */
function nieuweBron(pid, cat, m) {
  var vrij = cat.soort === "toeslag", def = m ? kindEindDefaults(m) : {};
  var einde = cat.code === "kopvang" && def.opvang ? isoDatum(def.opvang) : cat.code === "kgb" && def.kgb ? isoDatum(def.kgb) : "";
  return { id: nieuwId(), persoon: pid, code: cat.code, naam: cat.code === "overig" ? "" : cat.label, soort: cat.soort, bruto: "", netto: "", freq: cat.freq, eersteMaand: 1, start: "", einde: einde, werktijd: 100, index: vrij ? "geen" : "cpi", indexPct: "", wijzigDatum: "", wijzigBruto: "", wijzigNetto: "" };
}
function foutenBron(b) {
  var n = b.naam || "Inkomen";
  if (b.soort === "toeslag") return leeg([b.netto === "" || getal(b.netto) <= 0 ? n + ": vul het bedrag per betaling in." : null, datumFout(b.start, n + " start"), datumFout(b.einde, n + " einde"), (geldigeDatum(b.start) && geldigeDatum(b.einde) && geldigeDatum(b.einde) <= geldigeDatum(b.start)) ? n + ": de einddatum moet na de startdatum liggen." : null]);
  return leeg([!b.naam ? "Geef elk inkomen een omschrijving." : null, nietNeg(b.bruto, n + " bruto"), nietNeg(b.netto, n + " netto"),
    (b.bruto === "" && b.netto === "") ? n + ": vul bruto of netto in." : null,
    datumFout(b.start, n + " start"), datumFout(b.einde, n + " einde"),
    (geldigeDatum(b.start) && geldigeDatum(b.einde) && geldigeDatum(b.einde) <= geldigeDatum(b.start)) ? n + ": de einddatum moet na de startdatum liggen." : null,
    (b.werktijd !== "" && b.soort === "loon" && (getal(b.werktijd) <= 0 || getal(b.werktijd) > 100)) ? n + ": werktijd moet tussen 1 en 100 procent liggen." : null]);
}
function bronKeuzes(c, pid) {
  var L = lijstL(c.S.profiel), w = (c.S.profiel.werk || {})[pid] || [];
  return BRON_CAT.filter(function (cat) {
    if (cat.soort === "toeslag" && cat.code !== "studiefin" && pid !== "A") return false;
    return w.length ? cat.wanneer(L, w) : (cat.soort === "toeslag" ? cat.wanneer(L, w) : true);
  });
}
function BronnenEditor(p) {
  var c = useC(), L = c.lijst("bronnen"), m = c.m;
  var items = L.items.filter(function (b) { return b.persoon === p.persoon; });
  var keuzes = bronKeuzes(c, p.persoon);
  var s = useState(""), gekozen = s[0], setGekozen = s[1];
  return h("div", null,
    items.length === 0 ? h("p", { className: "klein" }, "Nog geen inkomsten voor deze persoon.") : null,
    items.map(function (b) {
      var w = function (patch) { L.wijzig(b.id, patch); };
      var vrij = b.soort === "toeslag";
      return h("div", { key: b.id, className: "kaart", style: { background: "#f8fafc" }, "data-item": "bron" },
        h("div", { className: "rij tussen", style: { marginBottom: ".4rem" } }, h("b", null, b.naam || "Overig inkomen"), h(Knop, { soort: "gevaar", klein: true, onClick: function () { if (window.confirm("Weet je zeker dat je dit wilt verwijderen?")) L.wis(b.id); } }, "Verwijder")),
        b.code === "overig" ? h(TekstVeld, { label: "Eigen omschrijving (zonder namen of nummers)", value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "bron-naam" }) : null,
        vrij ? h("div", null,
          h("div", { className: "raster" }, h(BedragVeld, { label: "Bedrag per betaling (netto)", value: b.netto, onChange: function (v) { w({ netto: v, bruto: "" }); }, naam: "bron-netto" }),
            h(KeuzeVeld, { label: "Hoe vaak ontvangen", value: b.freq || "maand", opties: FREQ_KEUZES, onChange: function (v) { w({ freq: v }); } })),
          (b.freq && b.freq !== "maand") ? h(KeuzeVeld, { label: "Eerste betaling in", value: String(b.eersteMaand || 1), opties: MAANDEN.map(function (n, i) { return [String(i + 1), n]; }), onChange: function (v) { w({ eersteMaand: Number(v) }); } }) : null,
          h(Uitleg, null, "Belastingvrij: het bedrag telt volledig mee. Pas het bedrag aan als de Belastingdienst of DUO een nieuw bedrag doorgeeft."))
        : h("div", null,
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Bruto per maand" + (b.soort === "loon" ? " (bij 100% werktijd)" : ""), value: b.bruto, onChange: function (v) { w({ bruto: v }); }, naam: "bron-bruto" }),
            h(BedragVeld, { label: "Netto per maand", hint: "Zoals op je specificatie. Weet je het netto niet? Laat het leeg en vul alleen het bruto in: de app berekent het netto, inclusief de heffingskorting op je hoogste inkomen.", value: b.netto, onChange: function (v) { w({ netto: v }); }, naam: "bron-netto" })),
          b.soort === "loon" ? h(BedragVeld, { label: "Werktijd (%)", hint: "100 = het ingevulde bedrag; 67 = tweederde.", value: b.werktijd, pct: true, onChange: function (v) { w({ werktijd: v }); }, naam: "bron-werktijd" }) : null),
        (!vrij && (b.netto === "" || b.netto == null) && getal(b.bruto) > 0) ? (function () {
          var dd = geldigeDatum(b.start) && eerstVanMaand(geldigeDatum(b.start)) > eerstVanMaand(m.peil) ? eerstVanMaand(geldigeDatum(b.start)) : eerstVanMaand(m.peil);
          var e = persoonMaand(m, b.persoon, dd).lijst.filter(function (x) { return x.id === b.id; })[0];
          return e ? h("p", { className: "groen klein", "data-berekend-netto": "1" }, "Berekend netto: circa " + eur(e.netto) + " per maand (met heffingskorting op je hoogste inkomen).") : h("p", { className: "klein" }, "Het netto berekent de app zodra het inkomen loopt.");
        })() : null,
        h("div", { className: "raster" },
          h(DatumVeld, { label: "Start (leeg = loopt al)", value: b.start, onChange: function (v) { w({ start: v }); }, naam: "bron-start" }),
          h(DatumVeld, { label: "Einde (vanaf deze dag geen inkomen meer)", hint: "Leeg = loopt door.", value: b.einde, onChange: function (v) { w({ einde: v }); }, naam: "bron-einde" })),
        h("div", { className: "raster" },
          h(KeuzeVeld, { label: "Indexatie per 1 januari", value: b.index, opties: INDEX_KEUZES, onChange: function (v) { w({ index: v }); }, naam: "bron-index" }),
          b.index === "vast" ? h(BedragVeld, { label: "Percentage per jaar", value: b.indexPct, pct: true, onChange: function (v) { w({ indexPct: v }); }, naam: "bron-indexpct" }) : null),
        !vrij ? h("details", null, h("summary", { className: "klein" }, "Eenmalige wijziging (bijv. nieuwe pensioenregels)"),
          h("div", { className: "raster3", style: { marginTop: ".4rem" } },
            h(DatumVeld, { label: "Vanaf datum", value: b.wijzigDatum, onChange: function (v) { w({ wijzigDatum: v }); } }),
            h(BedragVeld, { label: "Nieuw bruto", value: b.wijzigBruto, onChange: function (v) { w({ wijzigBruto: v }); } }),
            h(BedragVeld, { label: "Nieuw netto", value: b.wijzigNetto, onChange: function (v) { w({ wijzigNetto: v }); } })),
          h(Uitleg, null, "Bedragen in prijzen van de peildatum; indexatie komt er daarna nog bovenop.")) : null);
    }),
    h("div", { className: "rij" },
      h("div", { style: { flex: 1, minWidth: "12rem" } }, h(KeuzeVeld, { label: "Inkomen toevoegen", value: gekozen, opties: [["", "Kies een soort inkomen"]].concat(keuzes.map(function (k) { return [k.code, k.label]; })), onChange: setGekozen, naam: "bron-soort-kies" })),
      h(Knop, { soort: "sec", disabled: !gekozen, onClick: function () { var cat = bronCat(gekozen); if (cat) { L.voeg(nieuweBron(p.persoon, cat, m)); setGekozen(""); } }, naam: "voeg-bron" }, "+ Toevoegen")));
}
function foutenToeslagen(c) {
  var kd = toeslagKandidaten(c), uit = [];
  if (lijstL(c.S.profiel).kbZelf) { var kbb = c.S.bronnen.filter(function (b) { return b.code === "kinderbijslag"; })[0]; if (!kbb || kbb.netto === "" || getal(kbb.netto) <= 0) uit.push("Vul het bedrag van je kinderbijslag in (of kies automatisch berekenen)."); }
  kd.kandidaten.forEach(function (k) {
    if (!k.antwoord) uit.push("Beantwoord de vraag over " + k.label.toLowerCase() + " (of kies 'Weet ik niet').");
    else if (k.antwoord === "ja") { var b = c.S.bronnen.filter(function (x) { return x.code === k.code; })[0]; if (!b || b.netto === "" || getal(b.netto) <= 0) uit.push("Vul het bedrag in van je " + k.label.toLowerCase() + ".") }
  });
  return uit;
}
function ToeslagenVraag() {
  var c = useC(), m = c.m, L = c.lijst("bronnen"), rn = useState(function () { return "tv" + nieuwId(); })[0];
  var kd = toeslagKandidaten(c);
  function antwoord(code, w) {
    c.zetPad("profiel", ["toeslagAntwoord", code], w);
    var cat = bronCat(code), bestaand = c.S.bronnen.filter(function (b) { return b.code === code; });
    if (w === "ja" && !bestaand.length && cat) L.voeg(nieuweBron("A", cat, m));
    if (w !== "ja" && bestaand.length) bestaand.forEach(function (b) { L.wis(b.id); });
  }
  if (!kd.kandidaten.length && !kd.geen.length) return h("div", null, h(KinderbijslagKeuze, null), h("p", null, "Op basis van je gegevens zijn er geen toeslagen om naar te vragen."));
  return h("div", { "data-toeslagvragen": "1" },
    h(KinderbijslagKeuze, null),
    kd.kandidaten.length ? h(Uitleg, null, "Op basis van je woning, inkomen, vermogen en gezin kun je mogelijk recht hebben op de toeslagen hieronder. De app rekent het bedrag niet uit; vul het bedrag van je beschikking in. Weet je het niet, kijk dan op toeslagen.nl voor een proefberekening.") : null,
    kd.kandidaten.map(function (k) {
      var b = c.S.bronnen.filter(function (x) { return x.code === k.code; })[0];
      return h("div", { key: k.code, className: "kaart", style: { background: "#f8fafc" }, "data-toeslagvraag": k.code },
        h("b", null, "Ontvang je " + k.label.toLowerCase() + "?"),
        h("p", { className: "klein" }, k.reden),
        [["ja", "Ja"], ["nee", "Nee"], ["onbekend", "Weet ik niet"]].map(function (o) {
          return h("label", { key: o[0], className: "vink" }, h("input", { type: "radio", name: rn + k.code, checked: k.antwoord === o[0], onChange: function () { antwoord(k.code, o[0]); }, "data-toeslag-antwoord": k.code + "-" + o[0] }), h("span", null, o[1]));
        }),
        k.antwoord === "ja" && b ? h("div", null,
          h(BedragVeld, { label: "Bedrag per betaling (netto)", value: b.netto, onChange: function (v) { L.wijzig(b.id, { netto: v, bruto: "", bijgewerkt: isoDatum(vandaag()) }); }, naam: "tv-bedrag-" + k.code }),
          h(KeuzeVeld, { label: "Hoe vaak ontvangen", value: b.freq || "maand", opties: FREQ_KEUZES, onChange: function (v) { L.wijzig(b.id, { freq: v }); } })) : null,
        k.antwoord === "onbekend" ? h("p", { className: "oranje klein" }, "Controleer dit op toeslagen.nl. Zodra je het weet, kun je het hier invullen.") : null);
    }),
    kd.geen.length ? h("div", { className: "kaart info" }, h("b", null, "Waarschijnlijk geen recht"), h("ul", { className: "lijst" }, kd.geen.map(function (t, i) { return h("li", { key: i }, t); }))) : null);
}
function WerkJarenTabel() {
  var c = useC(), m = c.m;
  var heeftLoon = function (pid) { return m.bronnen.some(function (b) { return b.persoon === pid && b.soort === "loon"; }); };
  var lijst = m.personen.filter(function (p) { return heeftLoon(p.id); });
  if (!lijst.length) return h("p", { className: "klein" }, "Niemand heeft loon of winst uit onderneming ingevuld, dus hier valt niets te kiezen.");
  return h("div", null, lijst.map(function (p) {
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
var POT_SOORTEN = [["lijfrente", "Lijfrente"], ["pensioen", "Pensioenpot"]];
function nieuwePot(pid, m) { return { id: nieuwId(), persoon: pid, naam: "Lijfrente", aanbieder: "", soort: "lijfrente", saldo: "", geblokkeerdTot: "", start: "", rendVoor: m.inst.rendPot, rendTijdens: m.inst.rendPotTijdens, looptijd: 20, inleg: "", inlegTot: "" }; }
function potNaam(soort, aanbieder) { return (soort === "pensioen" ? "Pensioenpot" : "Lijfrente") + (aanbieder ? " (" + aanbieder + ")" : ""); }
function foutenPot(b) {
  var n = b.naam || "Pot";
  return leeg([nietNeg(b.saldo, n + " saldo"), b.saldo === "" ? n + ": vul het saldo in." : null, nietNeg(b.inleg, n + " inleg"),
    datumFout(b.geblokkeerdTot, n + " geblokkeerd tot"), datumFout(b.start, n + " start uitkering"), datumFout(b.inlegTot, n + " inleg tot"),
    getal(b.looptijd) <= 0 ? n + ": vul een looptijd van de uitkering in (jaren)." : null]);
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
          h(KeuzeVeld, { label: "Soort", value: b.soort, opties: POT_SOORTEN, onChange: function (v) { w({ soort: v, naam: potNaam(v, b.aanbieder) }); } }),
          h(KeuzeVeld, { label: "Van", value: b.persoon, opties: persOpties(m), onChange: function (v) { w({ persoon: v }); } })),
        h("div", { className: "raster" },
          h(TekstVeld, { label: "Bank of verzekeraar", value: b.aanbieder, lijst: "bankenlijst", onChange: function (v) { w({ aanbieder: v, naam: potNaam(b.soort, v) }); }, naam: "pot-aanbieder" }),
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
var HYP_VORM_UITLEG = { annuiteit: "Vaste maandlast; je lost steeds meer af en betaalt steeds minder rente.", lineair: "Vaste aflossing per maand; de maandlast daalt omdat de rente daalt.", aflossingsvrij: "Je lost niet af; de maandlast is alleen rente.", spaar: "Je lost niet af op de lening; de premie bouwt kapitaal op bij een bank of verzekeraar. Dat kapitaal is niet gemodelleerd." };
var HYP_VORMEN = [["annuiteit", "Annuïteit"], ["lineair", "Lineair"], ["aflossingsvrij", "Aflossingsvrij"], ["spaar", "Spaar- of beleggingshypotheek"]];
function nieuwHypDeel() { return { id: nieuwId(), box: "", bedrag: "", rente: "", maandlast: "", aflossing: "", vorm: "annuiteit", aflosEinde: "", herzienDatum: "", variabel: false, nieuweRente: "" }; }
function foutenHypDeel(dl, i) {
  var n = "Hypotheekdeel " + (i + 1);
  return leeg([dl.box !== "1" && dl.box !== "3" ? n + ": kies box 1 (eigen woning) of box 3 (niet aan de eigen woning besteed)." : null,
    getal(dl.bedrag) <= 0 ? n + ": vul het openstaande bedrag in." : null, dl.rente === "" ? n + ": vul de rente in." : null, nietNeg(dl.rente, n + " rente"),
    dl.maandlast === "" ? n + ": vul de maandlast in." : null, nietNeg(dl.maandlast, n + " maandlast"),
    datumFout(dl.aflosEinde, n + " einde aflossing"),
    (!dl.variabel && !geldigeDatum(dl.herzienDatum)) ? n + ": vul de renteherzieningsdatum in (of vink variabele rente aan). Dit is een belangrijk risico." : null,
    nietNeg(dl.nieuweRente, n + " verwachte rente")]);
}
function HypotheekForm() {
  var c = useC(), L = c.lijst("hyp", "delen"), m = c.m, hy = c.S.hyp;
  if (c.S.profiel.leef.woning !== "koop") return h("p", { className: "klein" }, "Een hypotheek is alleen van toepassing bij een koopwoning. Je hebt bij de algemene intake een andere woonsituatie gekozen.");
  var risico = hypRisico(m);
  var geenInkomen = !m.bronnen.some(function (b) { return b.soort !== "toeslag"; });
  return h("div", null,
    h(Uitleg, null, "Voeg elk hypotheekdeel apart toe: er is geen maximum. Heb je geen hypotheek (meer), laat het dan leeg. Geef per deel aan of het in box 1 valt (besteed aan de eigen woning, rente aftrekbaar) of in box 3 (niet aan de eigen woning besteed, bijvoorbeeld voor een auto of studie; geen renteaftrek)."),
    h(LijstEditor, {
      naam: "hypdeel", items: L.items, leeg: "Nog geen hypotheekdelen.", voegTekst: "Hypotheekdeel toevoegen",
      kop: function (dl, i) { return "Hypotheekdeel " + (i + 1) + (dl.box === "1" ? " · box 1" : dl.box === "3" ? " · box 3" : "") + (getal(dl.bedrag) ? " · " + eur(dl.bedrag) : ""); },
      onVoeg: function () { L.voeg(nieuwHypDeel()); }, onWis: L.wis, onWijzig: L.wijzig,
      velden: function (dl, w) {
        var idx = L.items.indexOf(dl), r = risico.filter(function (x) { return x.naam.indexOf("Hypotheekdeel " + (idx + 1)) === 0; })[0];
        return h("div", null,
          h(KeuzeVeld, { label: "In welke box valt dit deel?", value: dl.box, opties: [["", "Kies box 1 of box 3"], ["1", "Box 1: besteed aan de eigen woning"], ["3", "Box 3: niet aan de eigen woning besteed"]], onChange: function (v) { w({ box: v }); }, naam: "hyp-box" }),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Openstaand bedrag", value: dl.bedrag, onChange: function (v) { w({ bedrag: v }); }, naam: "hyp-bedrag" }),
            h(BedragVeld, { label: "Rente (%)", value: dl.rente, pct: true, onChange: function (v) { w({ rente: v }); }, naam: "hyp-rente" })),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Maandlast van dit deel nu (bruto)", hint: dl.vorm === "spaar" ? "Rente plus premie voor de spaar- of beleggingsrekening." : "Rente en aflossing samen.", value: dl.maandlast, onChange: function (v) { w({ maandlast: v }); }, naam: "hyp-maandlast" }),
            dl.vorm === "lineair" ? h(BedragVeld, { label: "Aflossing per maand (vast bedrag)", hint: "Leeg: de app rekent met de looptijd.", value: dl.aflossing, onChange: function (v) { w({ aflossing: v }); }, naam: "hyp-aflossing" }) : null),
          h("div", { className: "raster" },
            h(KeuzeVeld, { label: "Aflossingsvorm", hint: HYP_VORM_UITLEG[dl.vorm || "annuiteit"], value: dl.vorm, opties: HYP_VORMEN, onChange: function (v) { w({ vorm: v }); }, naam: "hyp-vorm" }),
            h(DatumVeld, { label: dl.vorm === "annuiteit" || dl.vorm === "lineair" ? "Einde looptijd (laatste aflossing)" : "Einde looptijd (aflossing of herfinanciering)", value: dl.aflosEinde, onChange: function (v) { w({ aflosEinde: v }); } })),
          h(Vink, { label: "Variabele rente (geen vaste rentevaste periode)", value: !!dl.variabel, onChange: function (v) { w({ variabel: v }); } }),
          !dl.variabel ? h("div", { className: "raster" },
            h(DatumVeld, { label: "Renteherzieningsdatum (einde rentevaste periode)", hint: "Staat op je hypotheekoverzicht. Daarna wordt de rente opnieuw vastgesteld: een risico.", value: dl.herzienDatum, onChange: function (v) { w({ herzienDatum: v }); }, naam: "hyp-herzien" }),
            h(BedragVeld, { label: "Verwachte rente daarna (%), leeg = gelijk", value: dl.nieuweRente, pct: true, onChange: function (v) { w({ nieuweRente: v }); } })) : null,
          r ? h("p", { className: r.variabel || (r.dagen != null && r.dagen <= 730) ? "oranje klein" : "klein" }, r.variabel ? "Variabele rente: bij 1 procentpunt hogere rente stijgt de maandlast met circa " + eur(r.impact) + "." : r.onbekend ? "Geen herzieningsdatum bekend." : (r.dagen < 0 ? "De renteherzieningsdatum is verstreken: werk de rente en datum bij." : "Rente wordt herzien over " + r.maanden + " maanden (" + fmtDatum(r.datum) + "). Bij 1 procentpunt hogere rente stijgt de maandlast met circa " + eur(r.impact) + ".")) : null);
      }
    }),
    h(Vink, { label: "Het belastingvoordeel van de hypotheekrente zit al in mijn netto salaris", hint: "Laat uit staan als je het voordeel apart terugkrijgt van de Belastingdienst (voorlopige teruggaaf). De app rekent het voordeel dan zelf uit en telt het mee.", value: !!hy.voordeelInNetto, onChange: function (v) { c.zet("hyp", { voordeelInNetto: v }); } }),
    geenInkomen && L.items.length ? h("p", { className: "oranje klein" }, "Voor het belastingvoordeel van de rente is je inkomen nodig. Vul bij Inkomen minstens het bruto bedrag in; het netto rekent de app uit.") : null,
    h(Uitleg, null, "De app rekent het voordeel uit: rente van de box 1-delen minus het eigenwoningforfait (0,35% van de WOZ-waarde), met de beperking in de hoogste schijf en de Hillen-regeling bij een lage hypotheek. Het voordeel wordt toegerekend aan de persoon met het hoogste inkomen."));
}

/* ----- Vaste lasten: vaste omschrijvingen op basis van de intake ----- */
var FREQ_KEUZES = [["maand", "Per maand"], ["kwartaal", "Per kwartaal"], ["halfjaar", "Per half jaar"], ["jaar", "Per jaar"]];
function nieuweLast(cat, pid, m, auto) {
  var naam = cat.code === "overig" ? "" : cat.label + (pid && m && m.personen.length > 1 ? " (" + persoonVan(m, pid).naam + ")" : "") + (auto && auto.toon ? " (" + auto.naam + ")" : "");
  var einde = cat.code === "kinderopvang" && m && kindEindDefaults(m).opvang ? isoDatum(kindEindDefaults(m).opvang) : "";
  return { id: nieuwId(), code: cat.code, persoon: pid || "", autoId: auto ? auto.id : "", naam: naam, bedrag: "", freq: cat.freq || "maand", eersteMaand: 1, index: cat.index || "cpi", indexPct: "", start: "", einde: einde };
}
function foutenLast(b) {
  var n = b.naam || "Post";
  return leeg([!b.naam ? "Geef elke vaste last een omschrijving." : null, b.bedrag === "" ? n + ": vul een bedrag in." : null, nietNeg(b.bedrag, n + " bedrag"),
    datumFout(b.start, n + " start"), datumFout(b.einde, n + " einde"),
    (geldigeDatum(b.start) && geldigeDatum(b.einde) && geldigeDatum(b.einde) <= geldigeDatum(b.start)) ? n + ": de einddatum moet na de startdatum liggen." : null]);
}
function LastRij(p) {
  var b = p.item, w = p.wijzig;
  return h("div", { style: { marginLeft: "1.7rem", marginBottom: ".5rem" } },
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Bedrag per betaling", value: b.bedrag, onChange: function (v) { w({ bedrag: v }); }, naam: "last-bedrag" }),
      h(KeuzeVeld, { label: "Hoe vaak", value: b.freq, opties: FREQ_KEUZES, onChange: function (v) { w({ freq: v }); } })),
    h("details", null, h("summary", { className: "klein" }, "Meer opties (indexatie, start, einde)"),
      h("div", { className: "raster", style: { marginTop: ".4rem" } },
        b.freq !== "maand" ? h(KeuzeVeld, { label: "Eerste betaling in", value: String(b.eersteMaand || 1), opties: MAANDEN.map(function (n, i) { return [String(i + 1), n]; }), onChange: function (v) { w({ eersteMaand: Number(v) }); } }) : null,
        h(KeuzeVeld, { label: "Indexatie", value: b.index, opties: INDEX_KEUZES, onChange: function (v) { w({ index: v }); } }),
        b.index === "vast" ? h(BedragVeld, { label: "Percentage per jaar", value: b.indexPct, pct: true, onChange: function (v) { w({ indexPct: v }); } }) : null,
        h(DatumVeld, { label: "Start (leeg = loopt al)", value: b.start, onChange: function (v) { w({ start: v }); } }),
        h(DatumVeld, { label: "Einde (leeg = loopt door)", value: b.einde, onChange: function (v) { w({ einde: v }); } }))));
}
function LastenEditor(p) {
  var c = useC(), L = c.lijst("lasten"), m = c.m, LL = lijstL(c.S.profiel);
  var toonG = p && p.groepen, toonOverig = !p || !p.groepen || p.overig;
  var items = L.items, autos = autosVan(LL);
  function vind(code, pid, autoId) { return items.filter(function (x) { return x.code === code && (x.persoon || "") === (pid || "") && (x.autoId || "") === (autoId || ""); })[0]; }
  var getoond = [];
  var groepen = LASTEN_GROEPEN.map(function (g) {
    var rijen = [];
    LASTEN_CAT.filter(function (cat) { return cat.groep === g && cat.wanneer(LL); }).forEach(function (cat) {
      if (cat.perAuto) {
        autos.filter(function (a) { return cat.perAuto === "alle" || a.soort === cat.perAuto; }).forEach(function (a) { rijen.push({ cat: cat, pid: "", auto: a }); });
      } else {
        var pids = cat.per ? m.personen.map(function (pp) { return pp.id; }) : [""];
        pids.forEach(function (pid) { rijen.push({ cat: cat, pid: pid, auto: null }); });
      }
    });
    return { naam: g, rijen: rijen };
  });
  groepen.forEach(function (g) { g.rijen.forEach(function (r) { var it = vind(r.cat.code, r.pid, r.auto ? r.auto.id : ""); if (it) getoond.push(it.id); }); });
  var overige = items.filter(function (x) { return getoond.indexOf(x.id) < 0; });
  return h("div", null,
    h(Uitleg, null, "Vink aan wat voor jou geldt en vul het bedrag in. De lijst past zich aan op je woning, auto('s) en gezin. Staat iets er niet bij? Voeg het onderaan toe als 'Overig'."),
    groepen.filter(function (g) { return g.rijen.length && (!toonG || toonG.indexOf(g.naam) >= 0); }).map(function (g) {
      return h("div", { key: g.naam, className: "kaart", style: { background: "#f8fafc" } },
        h("h3", null, g.naam),
        g.rijen.map(function (r) {
          var autoId = r.auto ? r.auto.id : "";
          var it = vind(r.cat.code, r.pid, autoId), label = r.cat.label + (r.pid && m.personen.length > 1 ? " (" + persoonVan(m, r.pid).naam + ")" : "") + (r.auto && r.auto.toon ? " (" + r.auto.naam + ")" : "");
          return h("div", { key: r.cat.code + r.pid + autoId, "data-last": r.cat.code },
            h("label", { className: "vink", style: { marginBottom: it ? ".2rem" : ".4rem" } },
              h("input", { type: "checkbox", checked: !!it, onChange: function (e) { if (e.target.checked) L.voeg(nieuweLast(r.cat, r.pid, m, r.auto)); else if (it) L.wis(it.id); }, "data-last-vink": r.cat.code + r.pid + autoId }),
              h("span", null, label)),
            it ? h(LastRij, { item: it, wijzig: function (patch) { L.wijzig(it.id, patch); } }) : null);
        }));
    }),
    toonOverig ? h("div", { className: "kaart", style: { background: "#f8fafc" } },
      h("h3", null, "Overig en andere posten"),
      overige.length === 0 ? h("p", { className: "klein" }, "Geen andere posten.") : null,
      overige.map(function (it) {
        return h("div", { key: it.id, "data-item": "last-overig" },
          h("div", { className: "rij tussen" }, h("b", null, it.naam || "Overig"), h(Knop, { soort: "gevaar", klein: true, onClick: function () { if (window.confirm("Weet je zeker dat je dit wilt verwijderen?")) L.wis(it.id); } }, "Verwijder")),
          h(TekstVeld, { label: "Omschrijving (zonder namen of nummers)", value: it.naam, onChange: function (v) { L.wijzig(it.id, { naam: v }); }, naam: "last-naam" }),
          h(LastRij, { item: it, wijzig: function (patch) { L.wijzig(it.id, patch); } }));
      }),
      h(Knop, { soort: "sec", onClick: function () { L.voeg(nieuweLast({ code: "overig", label: "", freq: "maand", index: "cpi" }, "", m, null)); }, naam: "voeg-last" }, "+ Overig vast bedrag")) : null);
}
function DagelijksVeld() {
  var c = useC();
  return h(BedragVeld, { label: "Dagelijkse uitgaven per maand", hint: "Boodschappen, kleding, uit eten, kleine uitgaven en alles wat niet in de vaste lasten staat.", value: c.S.dagelijks.bedrag, onChange: function (v) { c.zet("dagelijks", { bedrag: v }); }, naam: "dagelijks" });
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
// De CPI wordt automatisch bijgehouden via 'Cijfers bijwerken'. Handmatig aanpassen kan, maar hoeft niet.
function CpiKaart() {
  var c = useC(), i = c.S.inst;
  var s = useState(false), open = s[0], setOpen = s[1];
  var v1 = useState(isoDatum(plusMaanden(vandaag(), -1)).slice(0, 7)), mnd = v1[0], setMnd = v1[1];
  var v2 = useState(""), pctGem = v2[0], setPctGem = v2[1];
  return h("div", null,
    h("p", null, "Verwachte inflatie: " + pct(i.cpi, 1) + " per jaar" + (i.cpiIjk ? ", bedragen op prijspeil " + i.cpiIjk : "") + ". Laatst bijgewerkt: " + (i.cpiStand ? fmtDatum(i.cpiStand) : "nog niet") + "."),
    h("p", { className: "klein" }, "Bron: CBS. Vaste lasten en dagelijkse uitgaven stijgen per maand mee (1/12 van het jaarpercentage). Je hoeft hier niets in te vullen: druk elke maand op 'Cijfers bijwerken'."),
    h(CijfersKnop, null),
    h("details", { style: { marginTop: ".5rem" } }, h("summary", { className: "klein" }, "Geavanceerd: handmatig aanpassen"),
      h("div", { className: "raster", style: { marginTop: ".4rem" } },
        h(BedragVeld, { label: "Verwachte inflatie per jaar (%)", value: i.cpi, pct: true, onChange: function (v) { c.zet("inst", { cpi: v }); }, naam: "cpi" }),
        h(MaandVeld, { label: "Bedragen gelden op het prijspeil van", value: i.cpiIjk, onChange: function (v) { c.zet("inst", { cpiIjk: v }); }, naam: "cpiIjk" })),
      h(Knop, { soort: "sec", klein: true, onClick: function () { setOpen(!open); }, naam: "cpi-update" }, "CPI bijwerken met een gemeten waarde"),
      open ? h("div", { className: "kaart info", style: { marginTop: ".5rem" } },
        h(MaandVeld, { label: "Gemeten maand", value: mnd, onChange: setMnd, naam: "cpi-maand" }),
        h(BedragVeld, { label: "Gemeten inflatie (% jaar op jaar)", value: pctGem, pct: true, onChange: setPctGem, naam: "cpi-gemeten" }),
        h(Knop, { disabled: pctGem === "", onClick: function () { cpiBijwerken(c, mnd, pctGem); setOpen(false); }, naam: "cpi-toepassen" }, "Toepassen")) : null));
}

/* ----- Vermogen ----- */
function nieuweRekening() { return { id: nieuwId(), bank: "", naam: "Spaarrekening", saldo: "", rente: "" }; }
var REKENING_NAMEN = ["Spaarrekening", "Betaalrekening", "Online spaarrekening", "Kinderspaarrekening", "Gezamenlijke rekening"];
function foutenRekeningen(c) {
  var uit = [];
  c.S.verm.rekeningen.forEach(function (r) {
    if (!r.bank) uit.push("Vul bij elke rekening de naam van de bank in.");
    if (r.saldo === "") uit.push((r.bank || "Rekening") + ": vul het saldo in.");
    var f = nietNeg(r.saldo, (r.bank || "Rekening") + " saldo") || nietNeg(r.rente, (r.bank || "Rekening") + " rente"); if (f) uit.push(f);
  });
  if (!c.S.verm.rekeningen.length) uit.push("Voeg minstens één spaar- of betaalrekening toe (of sla deze stap over).");
  return uit;
}
function SpaarVeld() {
  var c = useC(), L = c.lijst("verm", "rekeningen"), i = c.S.inst;
  return h("div", null,
    h(BankenLijst, null),
    h(Uitleg, null, "Alleen de naam van de bank en de soort rekening, geen rekeningnummer. Tel hier alleen geld dat je direct kunt opnemen."),
    h(LijstEditor, {
      naam: "rekening", items: L.items, leeg: "Nog geen rekeningen.", voegTekst: "Rekening toevoegen",
      kop: function (r) { return (r.bank || "Nieuwe rekening") + " · " + (r.naam || "") + (r.saldo !== "" ? " · " + eur(r.saldo) : ""); },
      onVoeg: function () { L.voeg(nieuweRekening()); }, onWis: L.wis, onWijzig: L.wijzig,
      velden: function (r, w) {
        return h("div", null,
          h("div", { className: "raster" },
            h(TekstVeld, { label: "Bank", value: r.bank, lijst: "bankenlijst", onChange: function (v) { w({ bank: v }); }, naam: "rek-bank" }),
            h(KeuzeVeld, { label: "Soort rekening", value: REKENING_NAMEN.indexOf(r.naam) >= 0 ? r.naam : "Spaarrekening", opties: REKENING_NAMEN.map(function (n) { return [n, n]; }), onChange: function (v) { w({ naam: v }); } })),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Saldo", value: r.saldo, onChange: function (v) { w({ saldo: v }); }, naam: "rek-saldo" }),
            h(BedragVeld, { label: "Rente per jaar (%), leeg = standaard", value: r.rente, pct: true, onChange: function (v) { w({ rente: v }); }, naam: "rek-rente" })));
      }
    }),
    h("div", { className: "raster" },
      h(BedragVeld, { label: "Standaard spaarrente per jaar (%)", hint: "Voor rekeningen zonder eigen rente.", value: i.spaarrente, pct: true, onChange: function (x) { c.zet("inst", { spaarrente: x }); }, naam: "spaarrente" })),
    h("div", { className: "rij" },
      h("span", { className: "klein" }, "Rente gecontroleerd op: " + (i.spaarrenteStand ? fmtDatum(i.spaarrenteStand) : "nog niet") + "."),
      h(Knop, { soort: "sec", klein: true, onClick: function () { c.zet("inst", { spaarrenteStand: isoDatum(vandaag()) }); }, naam: "rente-gecontroleerd" }, "Vandaag gecontroleerd")));
}
function nieuwDeposito() { return { id: nieuwId(), bank: "", naam: "", bedrag: "", rente: "", start: "", looptijd: "", eind: "", uitkering: "einde", reedsUitgekeerd: "" }; }
function depNaam(d) { return (d.bank ? d.bank : "Deposito") + (d.looptijd ? " " + d.looptijd + " mnd" : ""); }
function foutenDeposito(d) {
  var n = d.bank || "Deposito";
  return leeg([!d.bank ? "Vul bij elk deposito de naam van de bank in." : null, getal(d.bedrag) <= 0 ? n + ": vul een bedrag in." : null, d.rente === "" ? n + ": vul de rente in." : null, nietNeg(d.rente, n + " rente"),
    !geldigeDatum(d.start) ? n + ": vul een geldige startdatum in." : null, !geldigeDatum(d.eind) ? n + ": vul een looptijd of einddatum in." : null,
    (geldigeDatum(d.start) && geldigeDatum(d.eind) && geldigeDatum(d.eind) <= geldigeDatum(d.start)) ? n + ": de einddatum moet na de startdatum liggen." : null]);
}
function DepositoEditor() {
  var c = useC(), L = c.lijst("verm", "deposito"), m = c.m;
  if (!c.S.profiel.gebruik.deposito) return h("div", null, h("p", { className: "klein" }, "Je gebruikt geen deposito's."), h(Knop, { soort: "sec", klein: true, onClick: function () { c.zetPad("profiel", ["gebruik", "deposito"], true); }, naam: "zet-deposito-aan" }, "Beginnen met deposito's"));
  return h("div", null,
    h(BankenLijst, null),
    h(LijstEditor, {
      naam: "deposito", items: L.items, leeg: "Nog geen deposito's.", voegTekst: "Deposito toevoegen",
      kop: function (d) { return (d.bank || "Nieuw deposito") + (d.bedrag !== "" ? " · " + eur(d.bedrag) : ""); },
      onVoeg: function () { L.voeg(nieuwDeposito()); }, onWis: L.wis, onWijzig: L.wijzig,
      velden: function (d, w) {
        var pl = depositoPlan(m, d);
        return h("div", null,
          h("div", { className: "raster" },
            h(TekstVeld, { label: "Bank", value: d.bank, lijst: "bankenlijst", onChange: function (v) { w({ bank: v, naam: depNaam(Object.assign({}, d, { bank: v })) }); }, naam: "dep-bank" }),
            h(BedragVeld, { label: "Bedrag", value: d.bedrag, onChange: function (v) { w({ bedrag: v }); }, naam: "dep-bedrag" })),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Rente per jaar (%)", value: d.rente, pct: true, onChange: function (v) { w({ rente: v }); }, naam: "dep-rente" }),
            h(DatumVeld, { label: "Startdatum", hint: "Ligt de start in de toekomst, dan gaat het bedrag op die dag van je spaarrekening af.", value: d.start, onChange: function (v) { var gd = geldigeDatum(v); w({ start: v, eind: gd && getal(d.looptijd) > 0 ? isoDatum(plusMaanden(gd, Math.round(getal(d.looptijd)))) : d.eind }); }, naam: "dep-start" })),
          h("div", { className: "raster" },
            h(BedragVeld, { label: "Looptijd (maanden)", value: d.looptijd, pct: true, onChange: function (v) { var gd = geldigeDatum(d.start); w({ looptijd: v, naam: depNaam(Object.assign({}, d, { looptijd: v })), eind: gd && getal(v) > 0 ? isoDatum(plusMaanden(gd, Math.round(getal(v)))) : d.eind }); }, naam: "dep-looptijd" }),
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
  if (!c.S.profiel.gebruik.beleggen) return h("div", null, h("p", { className: "klein" }, "Je belegt niet."), h(Knop, { soort: "sec", klein: true, onClick: function () { c.zetPad("profiel", ["gebruik", "beleggen"], true); }, naam: "zet-beleggen-aan" }, "Beginnen met beleggen"));
  return h("div", null,
    h(BankenLijst, null),
    h(LijstEditor, {
      naam: "belegging", items: L.items, leeg: "Nog geen beleggingsrekeningen.", voegTekst: "Beleggingsrekening toevoegen",
      kop: function (b) { return (b.bank || "Nieuwe rekening") + (b.waarde !== "" ? " · " + eur(b.waarde) : ""); },
      onVoeg: function () { L.voeg({ id: nieuwId(), bank: "", naam: "", waarde: "", soort: "vrij" }); }, onWis: L.wis, onWijzig: L.wijzig,
      velden: function (b, w) {
        return h("div", { className: "raster" },
          h(TekstVeld, { label: "Bank of broker", value: b.bank, lijst: "bankenlijst", onChange: function (v) { w({ bank: v, naam: v + " " + (b.soort === "pensioen" ? "pensioen" : "vrij beleggen") }); }, naam: "bel-bank" }),
          h(BedragVeld, { label: "Waarde nu", value: b.waarde, onChange: function (v) { w({ waarde: v }); }, naam: "bel-waarde" }),
          h(KeuzeVeld, { label: "Soort", hint: "Vrij beleggen telt mee in het beleggingsadvies. Pensioenbeleggingen niet.", value: b.soort, opties: [["vrij", "Vrij beleggen"], ["pensioen", "Pensioen of lijfrente (geblokkeerd)"]], onChange: function (v) { w({ soort: v, naam: (b.bank || "") + " " + (v === "pensioen" ? "pensioen" : "vrij beleggen") }); }, naam: "bel-soort" }));
      }
    }));
}
var OVERIG_NAMEN = ["Auto", "Boot of caravan", "Kunst en sieraden", "Tweede woning", "Onderneming (waarde)", "Overige bezitting"];
function OverigEditor() {
  var c = useC(), L = c.lijst("verm", "overig");
  return h(LijstEditor, {
    naam: "overig", items: L.items, leeg: "Geen overige bezittingen.", voegTekst: "Bezitting toevoegen",
    kop: function (b) { return (b.naam || "Nieuwe bezitting") + (b.waarde !== "" ? " · " + eur(b.waarde) : ""); },
    onVoeg: function () { L.voeg({ id: nieuwId(), naam: "", waarde: "", box3: false }); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null,
        h(OmschrijvingKeuze, { label: "Soort bezitting", opties: OVERIG_NAMEN, value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "overig-naam" }),
        h(BedragVeld, { label: "Waarde", value: b.waarde, onChange: function (v) { w({ waarde: v }); } }),
        h(Vink, { label: "Telt mee in box 3 (niet je eigen woning)", value: !!b.box3, onChange: function (v) { w({ box3: v }); } }));
    }
  });
}
var SCHULD_NAMEN = ["Persoonlijke lening", "Studieschuld", "Creditcard of krediet", "Lening aan kind(eren)", "Lening aan familie of vrienden", "Overige schuld of lening"];
function SchuldenEditor() {
  var c = useC(), L = c.lijst("verm", "schulden");
  return h(LijstEditor, {
    naam: "schuld", items: L.items, leeg: "Geen schulden of uitstaande leningen.", voegTekst: "Schuld of lening toevoegen",
    kop: function (b) { return (b.naam || "Nieuw") + (b.bedrag !== "" ? " · " + eur(b.bedrag) : ""); },
    onVoeg: function () { L.voeg({ id: nieuwId(), naam: "", bedrag: "", soort: "schuld" }); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null,
        h(OmschrijvingKeuze, { label: "Omschrijving", opties: SCHULD_NAMEN, value: b.naam, onChange: function (v) { w({ naam: v }); }, naam: "schuld-naam" }),
        h("div", { className: "raster" },
          h(BedragVeld, { label: "Bedrag", value: b.bedrag, onChange: function (v) { w({ bedrag: v }); } }),
          h(KeuzeVeld, { label: "Soort", hint: "Vreemd vermogen telt niet mee in je vrije vermogen.", value: b.soort, opties: [["schuld", "Ik ben het schuldig"], ["uitstaand", "Ik heb het uitgeleend"]], onChange: function (v) { w({ soort: v }); } })));
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
          h(OmschrijvingKeuze, { label: "Doel", opties: RESERVERING_NAMEN, value: r.naam, onChange: function (v) { w({ naam: v }); }, naam: "res-naam" }),
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
  return leeg([!b.omschrijving ? "Kies bij elke boeking een omschrijving." : null, !geldigeDatum(b.datum) ? n + ": vul een geldige datum in." : null, getal(b.bedrag) <= 0 ? n + ": vul een bedrag in (groter dan 0)." : null]);
}
function BoekingenEditor() {
  var c = useC(), L = c.lijst("grote", "boekingen"), res = c.S.grote.reserveringen || [];
  return h(LijstEditor, {
    naam: "boeking", items: L.items, leeg: "Nog geen geplande grote inkomsten of uitgaven.", voegTekst: "Boeking toevoegen",
    kop: function (b) { return (b.omschrijving || "Nieuwe boeking") + (b.bedrag !== "" ? " · " + (b.type === "inkomst" ? "+" : "-") + eur(b.bedrag) : ""); },
    onVoeg: function () { L.voeg(nieuweBoeking()); }, onWis: L.wis, onWijzig: L.wijzig,
    velden: function (b, w) {
      return h("div", null,
        h("div", { className: "raster" },
          h(OmschrijvingKeuze, { label: "Omschrijving", opties: BOEKING_NAMEN, value: b.omschrijving, onChange: function (v) { w({ omschrijving: v }); }, naam: "boek-omschrijving" }),
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
  return h(BedragVeld, { label: "Minimale buffer aan spaargeld", hint: "Het bedrag dat je altijd direct beschikbaar wilt houden. Dit is voor iedereen anders. Onder dit bedrag wil je niet komen en je belegt er niet voor bij.", value: c.S.grote.minimum, onChange: function (v) { c.zet("grote", { minimum: v }); }, naam: "minimum" });
}

/* ----- Inkomensaanvulling: jij geeft het bedrag, de app toetst het ----- */
function foutenAanv(c) {
  var a = c.S.aanv, B = c.m.aanvB;
  return leeg([getal(a.maand) <= 0 ? "Vul in hoeveel aanvulling je per maand wilt." : null,
    datumFout(a.opnameVanaf, "Vanaf"), a.totType === "datum" ? (geldigeDatum(a.einde) ? null : "Vul de einddatum in.") : null,
    (B && getal(a.maand) > 0 && B.L <= 0) ? "Het einde ligt niet na het begin. Kies een latere einddatum of controleer de AOW-datum." : null]);
}
function aanvulOordeel(B, bron) {
  var kan = bron === "sparen" ? B.kanS : B.kanB, tekort = Math.max(0, (bron === "sparen" ? B.nodigS - B.besS : B.nodigB - B.besB)), max = bron === "sparen" ? B.maxXS : B.maxXB;
  return kan ? h("span", { className: "groen" }, "Dit kan.") : h("span", { className: "rood" }, "Dit kan niet helemaal: tekort " + eur(tekort) + ". Haalbaar is circa " + eur(max) + " per maand.");
}
function AanvulVelden() {
  var c = useC(), a = c.S.aanv, m = c.m, B = m.aanvB, gb = c.S.profiel.gebruik;
  function z(patch) { c.zet("aanv", patch); }
  var fasen = useMemo(function () { return fasenLijst(m); }, [m]);
  var tekorten = fasen.map(function (f) { return { naam: f.naam, d: f.d, t: f.saldo - f.aanvulling }; }).filter(function (x) { return x.t < -1 && x.d >= eerstVanMaand(m.peil); });
  var aowOpties = m.personen.map(function (p) { return [p.id, "AOW van " + p.naam + (p.aow ? " (" + fmtDatum(p.aow) + ")" : "")]; });
  return h("div", null,
    h(BedragVeld, { label: "Hoeveel aanvulling wil je per maand? (netto)", hint: "Het bedrag dat je maandelijks extra nodig hebt tot een bepaald moment, meestal tot de AOW.", value: a.maand, onChange: function (v) { z({ maand: v }); }, naam: "aanv-maand" }),
    tekorten.length ? h("p", { className: "klein" }, "Ter indicatie: zonder aanvulling heb je in de volgende fasen een tekort per maand: " + tekorten.slice(0, 3).map(function (x) { return x.naam + " (" + fmtMaand(x.d) + ") " + eur(-x.t); }).join("; ") + ".") : null,
    h("div", { className: "raster" },
      h(DatumVeld, { label: "Vanaf (leeg = nu)", value: a.opnameVanaf, onChange: function (v) { z({ opnameVanaf: v }); }, naam: "aanv-vanaf" }),
      h(KeuzeVeld, { label: "Tot", value: a.totType, opties: [["aow", "Tot de AOW"], ["datum", "Tot een eigen datum"]], onChange: function (v) { z({ totType: v }); }, naam: "aanv-tot" })),
    a.totType === "aow" && m.personen.length > 1 ? h(KeuzeVeld, { label: "Welke AOW", value: a.totPersoon || "A", opties: aowOpties, onChange: function (v) { z({ totPersoon: v }); } }) : null,
    a.totType === "datum" ? h(DatumVeld, { label: "Einddatum", value: a.einde, onChange: function (v) { z({ einde: v }); }, naam: "aanv-einde" }) : null,
    gb.beleggen ? h(KeuzeVeld, { label: "Waaruit wil je dit betalen?", value: a.bron, opties: [["sparen", "Uit spaargeld"], ["beleggen", "Uit beleggingen"]], onChange: function (v) { z({ bron: v }); }, naam: "aanv-bron" }) : null,
    h("div", { className: "kaart info", "data-aanv-oordeel": "1" },
      h("b", null, "Kan dat?"),
      (!B || B.X <= 0) ? h("p", null, "Vul het bedrag in om te zien of het kan.") :
      B.L <= 0 ? h("p", { className: "rood" }, "Kies een einddatum na het begin, of vul de geboortedatum in zodat de AOW-datum bekend is.") :
      h("div", null,
        h("p", null, "Looptijd: " + Math.floor(B.L / 12) + " jaar" + (B.L % 12 ? " en " + (B.L % 12) + " maanden" : "") + " (" + fmtMaand(B.start) + " tot " + fmtMaand(B.eind) + ")."),
        h(Tabel, { kop: ["Bron (rendement)", "Nodig", "Beschikbaar"], get: [1, 2], rijen: [
          ["Spaargeld (" + pct(B.rS, 1) + ")", eur(B.nodigS), eur(B.besS)]
        ].concat(gb.beleggen ? [["Beleggingen (" + pct(B.rB, 1) + ")", eur(B.nodigB), eur(B.besB)]] : []) }),
        h("p", { className: "klein" }, "Beschikbaar spaargeld = je spaargeld boven je minimale buffer van " + eur(B.buffer) + ". Beschikbaar bij beleggingen = je vrij belegde vermogen. Nodig = het bedrag dat je nu apart moet zetten om elke maand " + eur(B.X) + " te kunnen opnemen, bij het standaard rendement."),
        h("p", null, h("b", null, "Uit spaargeld: "), aanvulOordeel(B, "sparen")),
        gb.beleggen ? h("p", null, h("b", null, "Uit beleggingen: "), aanvulOordeel(B, "beleggen")) : null,
        h("p", null, "De planning reserveert " + eur(B.K) + " uit " + (B.bron === "sparen" ? "je spaargeld" : "je beleggingen") + " voor deze aanvulling." + (B.K < (B.bron === "sparen" ? B.nodigS : B.nodigB) - 0.5 ? " Dat is minder dan nodig, dus de pot raakt eerder leeg." : "")))));
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
