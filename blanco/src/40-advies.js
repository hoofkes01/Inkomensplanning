/* ===== Beleggingsadvies: vrij beleggen, ISIN's en bedragen (geen koersen of aantallen) ===== */
// Alleen accumulating ETF's. 'gecontroleerd' = ISIN gecontroleerd bij de release (datum). Bij twijfel geen ISIN tonen.
var ADVIES_CHECK_DATUM = "2026-10-18";
var ADVIES_FONDSEN = [
  { cat: "def", hoofd: true, naam: "iShares Core € Corp Bond UCITS ETF EUR (Acc)", isin: "IE00BF11F565", ter: 0.09, rend: 3.82, rendBron: "iShares-factsheet, yield to worst; controleer de datum bij iShares", soort: "Euro bedrijfsobligaties; looptijd circa 4 jaar, dus gevoelig voor een stijgende rente", gecontroleerd: true },
  { cat: "def", hoofd: false, naam: "Xtrackers II Eurozone Government Bond 1-3 UCITS ETF 1C", isin: "LU0290356871", ter: 0.10, rend: null, rendBron: "rendement niet gecontroleerd: vul zelf in", soort: "Euro staatsobligaties 1 tot 3 jaar", gecontroleerd: false },
  { cat: "neu", hoofd: true, naam: "Vanguard LifeStrategy 60% Equity UCITS ETF (EUR) Acc", isin: "IE00BMVB5P51", ter: 0.25, rend: null, rendBron: "", soort: "60% aandelen, 40% obligaties", gecontroleerd: false },
  { cat: "neu", hoofd: false, naam: "Vanguard LifeStrategy 40% Equity UCITS ETF (EUR) Acc", isin: "IE00BMVB5M21", ter: 0.25, rend: null, rendBron: "", soort: "40% aandelen, 60% obligaties", gecontroleerd: true },
  { cat: "off", hoofd: true, naam: "Vanguard FTSE All-World UCITS ETF USD Acc", isin: "IE00BK5BQT80", ter: 0.19, rend: null, rendBron: "", soort: "Wereldwijd aandelen, inclusief opkomende landen", gecontroleerd: false },
  { cat: "off", hoofd: false, naam: "iShares Core MSCI World UCITS ETF USD Acc", isin: "IE00B4L5Y983", ter: 0.20, rend: null, rendBron: "", soort: "Aandelen ontwikkelde landen", gecontroleerd: false },
  { cat: "off", hoofd: false, naam: "Vanguard LifeStrategy 80% Equity UCITS ETF (EUR) Acc", isin: "IE00BMVB5R75", ter: 0.25, rend: null, rendBron: "", soort: "80% aandelen, 20% obligaties", gecontroleerd: true }
];
var ADVIES_CAT = { def: "Defensief", neu: "Neutraal", off: "Offensief" };
var ADVIES_KLEUR = { def: "#0d9488", neu: "#2563eb", off: "#7c3aed" };
var ADVIES_STRESS = { off: -0.25, neu: -0.12, def: -0.03 };
var ADVIES_MARKT_STANDAARD = {
  datum: "2026-10-18",
  punten: [
    "Rente: de ECB verhoogde op 10 september 2026 de depositorente met 0,25 procentpunt naar 2,50% (ingegaan op 16 september). In juli bleef de rente nog 2,25%. De ECB beslist per vergadering en legt zich niet vast. Bron: ECB.",
    "Inflatie: 3,4% in september 2026 in Nederland (augustus 3,3%), vooral door duurdere brandstof. In de eurozone was de inflatie 3,8%. Sparen en defensief beleggen levert bij een rente rond 3% weinig reëel rendement op. Bron: CBS.",
    "Obligaties: bij een stijgende rente dalen de koersen van obligatiefondsen. Fondsen met een korte looptijd reageren minder sterk dan fondsen met een lange looptijd.",
    "Aandelen: koersen schommelen sterk en zijn niet te voorspellen. De stresstest hieronder laat zien wat een daling van 25% voor jouw portefeuille betekent.",
    "Jouw controle: vul bij 'Marktbeeld' zelf de actuele stand in als je deze wilt bijhouden; de app kan geen koersen of rentes zelf ophalen."
  ]
};
function adviesParams(m) {
  var A = m.advies || {};
  var N = function (v, d) { return v === "" || v == null || !isFinite(Number(v)) ? d : Number(v); };
  return {
    doel: { off: N(A.doelOff, 50), neu: N(A.doelNeu, 30), def: N(A.doelDef, 20) },
    drempel: N(A.drempel, 15000), marge: N(A.marge, 0.3), belasting: N(A.belasting, 36),
    stelsel: A.stelsel === "werkelijk" ? "werkelijk" : "forfait", fSparen: N(A.forfaitSparen, 1.28), fBeleg: N(A.forfaitBeleg, 6),
    euribor: N(A.euribor, 0), raisin: N(A.raisin6, 0), wachtTot: N(A.wachtTot, 0), behoudAan: !!A.behoudAan
  };
}
function fondsRend(m, f) {
  var o = ((m.advies || {}).rend || {})[f.isin];
  if (o && o.rend !== "" && o.rend != null) return { rend: Number(o.rend), datum: o.datum || "", eigen: true };
  var ext = ((m.cijfers || {}).fondsen || {})[f.isin];
  if (ext && ext.rend != null) return { rend: Number(ext.rend), datum: ext.datum || (m.cijfers || {}).versie || "", eigen: false };
  return { rend: f.rend, datum: f.rend != null ? ADVIES_CHECK_DATUM : "", eigen: false };
}
function adviesNettoRaisin(P) { var t = P.belasting / 100; return P.stelsel === "forfait" ? P.raisin - t * P.fSparen : P.raisin * (1 - t); }
function adviesMinDef(P) {
  var t = P.belasting / 100, doelNetto = adviesNettoRaisin(P) + P.marge;
  return Math.round((P.stelsel === "forfait" ? doelNetto + t * P.fBeleg : doelNetto / (1 - t)) * 100) / 100;
}
function adviesVoldoetMin(m, f, P) { var r = fondsRend(m, f); return r.rend != null && r.rend - f.ter >= adviesMinDef(P); }
function adviesCategorie(naam, isin) {
  var i = String(isin || "").toUpperCase();
  var f = ADVIES_FONDSEN.filter(function (x) { return x.isin === i; })[0];
  if (f) return f.cat;
  var n = String(naam || "").toLowerCase();
  if (/obligat|bond|govt|treasury|corp|money|overnight|geldmarkt|ultrashort/.test(n)) return "def";
  if (/min(imum)?\s*vol|low vol|lifestrategy\s*(20|40|60)|multi.?asset|dividend|quality/.test(n)) return "neu";
  return "off";
}
function catVan(r) { return r.cat === "def" || r.cat === "neu" || r.cat === "off" ? r.cat : adviesCategorie(r.naam, r.isin); }
// Fondsen en bedragen om te kopen in een categorie. Defensief alleen bij fondsen die de ondergrens halen.
function adviesKoopRegels(m, c, bedrag, P) {
  if (c !== "def") { var f = ADVIES_FONDSEN.filter(function (x) { return x.cat === c && x.hoofd; })[0]; return f ? [{ f: f, bedrag: bedrag }] : []; }
  var ok = ADVIES_FONDSEN.filter(function (x) { return x.cat === "def" && adviesVoldoetMin(m, x, P); });
  if (!ok.length) return [];
  var deel = afr10(bedrag / ok.length);
  return ok.map(function (f, i) { return { f: f, bedrag: i === ok.length - 1 ? bedrag - deel * (ok.length - 1) : deel }; });
}
// Offensieve aankopen in 3 maandelijkse delen.
function drieTranches(bedrag) {
  var a = afr10(bedrag / 3);
  return [a, a, bedrag - 2 * a];
}

function adviesBerekening(m, sim) {
  var P = adviesParams(m);
  var doel = { def: P.doel.def, neu: P.doel.neu, off: P.doel.off };
  var defVervangen = doel.def > 0 && !ADVIES_FONDSEN.some(function (f) { return f.cat === "def" && adviesVoldoetMin(m, f, P); });
  var defOrigineel = doel.def;
  if (defVervangen) { doel.neu += doel.def; doel.def = 0; }
  var somDoel = doel.def + doel.neu + doel.off;
  var spaarNu = sim.maand[0].spaar;
  var minKomend = spaarNu, minDatum = null;
  sim.maand.slice(0, 13).forEach(function (r) { if (r.min < minKomend) { minKomend = r.min; } });
  var ruimteNu = Math.max(0, spaarNu - P.drempel);
  var blijvendNu = Math.max(0, Math.min(spaarNu, minKomend) - P.drempel);
  var tekortKomend = Math.max(0, P.drempel - minKomend);
  var koopBasis = Math.min(ruimteNu, blijvendNu);
  var pf = ((m.advies || {}).pf || []).filter(function (x) { return getal(x.waarde) > 0; }).map(function (x) {
    return { naam: x.naam, isin: x.isin || "", waarde: getal(x.waarde), cat: catVan(x), behoud: !!x.behoud };
  });
  var huidig = { def: 0, neu: 0, off: 0 };
  pf.forEach(function (x) { huidig[x.cat] += x.waarde; });
  var totaalNu = huidig.def + huidig.neu + huidig.off;
  var behoefte = { def: 0, neu: 0, off: 0 };
  ["def", "neu", "off"].forEach(function (c) { behoefte[c] = Math.max(0, (somDoel > 0 ? doel[c] / somDoel : 0) * (totaalNu + koopBasis) - huidig[c]); });
  var somBeh = behoefte.def + behoefte.neu + behoefte.off;
  var koop = {};
  ["def", "neu", "off"].forEach(function (c) { koop[c] = somBeh > 0 ? afr10(koopBasis * behoefte[c] / somBeh) : 0; });
  var t0 = sim.maand[0], defVermogen = 0;
  var vi = vermogenItems(m, t0.d, t0.spaar, t0.res), vt = vermogenTotalen(vi);
  defVermogen = vt.sparen + vt.deposito;
  var P100 = function (a, b) { return b > 0 ? Math.round(a / b * 100) : 0; };
  var waarnemingen = [];
  if (defVervangen) waarnemingen.push("Geen defensief fonds levert na kosten meer dan een deposito van 6 maanden plus je marge (nodig: " + pct(adviesMinDef(P), 2) + "). Het defensieve deel (" + defOrigineel + "%) is daarom naar neutraal verschoven. Defensief geld blijft in deposito's.");
  if (totaalNu > 0) {
    waarnemingen.push("Je vrij belegde vermogen is " + eur(totaalNu) + ": " + P100(huidig.off, totaalNu) + "% offensief, " + P100(huidig.neu, totaalNu) + "% neutraal en " + P100(huidig.def, totaalNu) + "% defensief (doel " + P100(doel.off, somDoel) + "/" + P100(doel.neu, somDoel) + "/" + P100(doel.def, somDoel) + "%).");
    if (defVermogen > 0) waarnemingen.push("Je defensieve vermogen (sparen " + eur(vt.sparen) + " + deposito's " + eur(vt.deposito) + ") is " + eur(defVermogen) + ". Samen met je vrij beleggen is dat " + eur(defVermogen + totaalNu) + ": " + P100(totaalNu, defVermogen + totaalNu) + "% belegd en " + P100(defVermogen, defVermogen + totaalNu) + "% defensief. " + (P100(defVermogen, defVermogen + totaalNu) >= 50 ? "Bij zo'n groot defensief deel past een offensievere opzet van je beleggingen." : "Het defensieve deel is beperkt; houd je buffer in de gaten."));
    var perFonds = {}; pf.forEach(function (x) { perFonds[x.naam] = (perFonds[x.naam] || 0) + x.waarde; });
    var gr = Object.keys(perFonds).map(function (n) { return { naam: n, waarde: perFonds[n] }; }).sort(function (a, b) { return b.waarde - a.waarde; })[0];
    if (gr && gr.waarde / totaalNu > 0.25 && pf.length > 1) waarnemingen.push("Grootste positie: " + gr.naam + " is " + P100(gr.waarde, totaalNu) + "% van je vrij beleggen (" + eur(gr.waarde) + "). Dat is veel voor één fonds.");
    var behoudSom = pf.filter(function (x) { return x.behoud; }).reduce(function (s, x) { return s + x.waarde; }, 0);
    if (behoudSom > 0) waarnemingen.push("Fondsen die je niet wilt verkopen zijn " + P100(behoudSom, totaalNu) + "% van je vrij beleggen (" + eur(behoudSom) + "). Ze tellen mee in hun eigen categorie.");
    if (huidig.def === 0) waarnemingen.push("Je hebt geen defensief deel in je beleggingen. Dat past bij een lange horizon; je spaargeld en deposito's vormen dan je buffer.");
  }
  return { P: P, doel: doel, somDoel: somDoel, defVervangen: defVervangen, defOrigineel: defOrigineel, spaarNu: spaarNu, minKomend: minKomend, ruimteNu: ruimteNu, blijvendNu: blijvendNu, tekortKomend: tekortKomend, koopBasis: koopBasis, koop: koop, somBeh: somBeh, behoefte: behoefte, pf: pf, huidig: huidig, totaalNu: totaalNu, defVermogen: defVermogen, vt: vt, waarnemingen: waarnemingen, pct: P100 };
}

// Voorstel voor de bestaande portefeuille: vier stappen (per kwartaal), beide richtingen, of niets doen.
function herbalanceerPlan(m, A) {
  var totaal = A.totaalNu;
  if (!(totaal > 0)) return null;
  var cats = ["def", "neu", "off"], P = A.P;
  var doelBedrag = function (c) { return (A.somDoel > 0 ? A.doel[c] / A.somDoel : 0) * totaal; };
  var gap = {};
  cats.forEach(function (c) { gap[c] = doelBedrag(c) - A.huidig[c]; });
  var afwijking = Math.max.apply(null, cats.map(function (c) { return Math.abs(gap[c]) / totaal * 100; }));
  var verkoopbaar = function (c) { return A.pf.filter(function (x) { return x.cat === c && !(P.behoudAan && x.behoud); }); };
  var cap = {};
  cats.forEach(function (c) { cap[c] = verkoopbaar(c).reduce(function (s, x) { return s + x.waarde; }, 0); });
  var verkoopNodig = function (c) { return Math.max(0, -gap[c]); }, koopNodig = function (c) { return Math.max(0, gap[c]); };
  var totaalVerschuiving = cats.reduce(function (s, c) { return s + koopNodig(c); }, 0);
  var somVerkoopNodig = cats.reduce(function (s, c) { return s + verkoopNodig(c); }, 0);
  var verkoopTotaal = [];
  cats.forEach(function (c) {
    if (verkoopNodig(c) <= 0 || somVerkoopNodig <= 0) return;
    var rest = Math.min(verkoopNodig(c), cap[c]);
    verkoopbaar(c).slice().sort(function (a, b) { return b.waarde - a.waarde; }).forEach(function (x) {
      if (rest <= 0) return;
      var v = Math.min(x.waarde, rest);
      if (afr10(v) > 0) verkoopTotaal.push({ cat: c, naam: x.naam, isin: x.isin, bedrag: afr10(v) });
      rest -= v;
    });
  });
  var verkocht = verkoopTotaal.reduce(function (s, x) { return s + x.bedrag; }, 0);
  var koopTotaal = { def: 0, neu: 0, off: 0 };
  cats.forEach(function (c) { koopTotaal[c] = totaalVerschuiving > 0 && koopNodig(c) > 0 ? afr10(verkocht * koopNodig(c) / totaalVerschuiving) : 0; });
  // Vier gelijke stappen, het restant in de laatste stap.
  var stappen = [];
  var vorigeVerkoop = verkoopTotaal.map(function () { return 0; }), vorigeKoop = { def: 0, neu: 0, off: 0 };
  for (var s = 0; s < 4 && verkocht > 0; s++) {
    var verkoop = verkoopTotaal.map(function (x, i) {
      var b = s === 3 ? x.bedrag - vorigeVerkoop[i] : afr10(x.bedrag / 4);
      vorigeVerkoop[i] += b; return { cat: x.cat, naam: x.naam, isin: x.isin, bedrag: b };
    }).filter(function (x) { return x.bedrag > 0; });
    var kp = {};
    cats.forEach(function (c) { var b = s === 3 ? koopTotaal[c] - vorigeKoop[c] : afr10(koopTotaal[c] / 4); vorigeKoop[c] += b; kp[c] = b; });
    stappen.push({ nr: s + 1, datum: plusMaanden(m.peil, 3 * s), verkoop: verkoop, koop: kp, bedrag: verkoop.reduce(function (t, x) { return t + x.bedrag; }, 0) });
  }
  var stressVan = function (sm) { return sm.def * ADVIES_STRESS.def + sm.neu * ADVIES_STRESS.neu + sm.off * ADVIES_STRESS.off; };
  var stressNu = stressVan(A.huidig);
  var stressDoel = stressVan({ def: doelBedrag("def"), neu: doelBedrag("neu"), off: doelBedrag("off") });
  var aanbeveling = afwijking < 5 || verkocht <= 0 ? "niets" : "gefaseerd";
  var richting = gap.off < 0 ? "defensiever" : "offensiever";
  var wachten = P.wachtTot > 0 && totaal < P.wachtTot && verkocht > 0;
  return { gap: gap, afwijking: afwijking, stappen: stappen, verkocht: verkocht, koopTotaal: koopTotaal, stressNu: stressNu, stressDoel: stressDoel, aanbeveling: aanbeveling, richting: richting, totaal: totaal, wachten: wachten, wachtTot: P.wachtTot, nogTeGaan: Math.max(0, P.wachtTot - totaal) };
}
function koopTekst(m, A, c, bedrag) {
  var regels = adviesKoopRegels(m, c, bedrag, A.P);
  if (!regels.length) return c === "def" ? "deposito " + eur(bedrag) : "";
  if (c === "off") {
    var t = drieTranches(bedrag);
    return regels.map(function (x) { return (x.f.isin || x.f.naam) + " " + eur(x.bedrag) + " (in 3 delen: " + t.map(eur).join(", ") + ")"; }).join(", ");
  }
  return regels.map(function (x) { return (x.f.isin || x.f.naam) + " " + eur(x.bedrag); }).join(", ");
}
function adviesSamenvatting(m, A) {
  var plan = herbalanceerPlan(m, A), regels = [];
  if (A.defVervangen) regels.push("Geen defensief fonds verslaat veilig sparen na kosten en belasting (minimaal " + pct(adviesMinDef(A.P), 2) + " nodig). Het defensieve deel is daarom neutraal geworden; defensief geld blijft in deposito's.");
  var pfDatum = geldigeDatum((m.advies || {}).pfDatum);
  if (A.totaalNu > 0 && pfDatum && dagenTussen(pfDatum, m.nu) > 30) regels.push("Je portefeuille is " + dagenTussen(pfDatum, m.nu) + " dagen geleden bijgewerkt. Upload hem opnieuw voor een actueel advies.");
  if (A.koopBasis > 0) regels.push("Bijbeleggen: je kunt ongeveer " + eur(afr10(A.koopBasis)) + " beleggen en blijft boven je drempel van " + eur(A.P.drempel) + ".");
  else regels.push("Bijbeleggen: nu niet. Je direct opneembare spaargeld (" + eur(A.spaarNu) + ") blijft niet boven je drempel van " + eur(A.P.drempel) + ". Niets doen is altijd een optie.");
  if (plan) {
    if (plan.aanbeveling === "gefaseerd") {
      var st = plan.stappen[0];
      var vTxt = st.verkoop.map(function (v) { return (v.isin || v.naam) + " " + eur(v.bedrag); }).join(", ");
      var kTxt = ["def", "neu", "off"].filter(function (c) { return st.koop[c] > 0; }).map(function (c) { return koopTekst(m, A, c, st.koop[c]); }).join(", ");
      if (plan.wachten) regels.push("Bestaande portefeuille: nu nog niets verkopen. De waarde is " + eur(plan.totaal) + " en je wacht met omzetten tot minimaal " + eur(plan.wachtTot) + " (nog " + eur(plan.nogTeGaan) + " te gaan). Bij herstel gaat het in vier stappen " + plan.richting + ".");
      else regels.push("Bestaande portefeuille, stap 1 van 4 (" + plan.richting + "): VERKOPEN " + vTxt + (kTxt ? "; KOPEN " + kTxt : "") + ".");
    } else regels.push("Bestaande portefeuille: je zit dicht bij je doelverdeling. Niets doen is het advies.");
    regels.push("Bij een aandelencorrectie van 25% verlies je nu circa " + eur(-plan.stressNu) + " tegen circa " + eur(-plan.stressDoel) + " bij de doelverdeling.");
  } else if (!A.totaalNu) regels.push("Bestaande portefeuille: nog niet ingevuld. Upload of vul je portefeuille in bij Beleggingsadvies.");
  return { regels: regels, plan: plan };
}

/* ---------- Upload: DEGIRO-csv, geplakte lijst of tekst uit de DEGIRO-app ---------- */
function adviesGetal(s) {
  var x = String(s == null ? "" : s).replace(/[€\s"]/g, "");
  if (!x) return NaN;
  if (/,\d{1,2}$/.test(x)) x = x.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,2}$/.test(x) && !/\.\d{3}\./.test(x)) x = x.replace(/,/g, "");
  else x = x.replace(/[.,]/g, "");
  var n = Number(x);
  return isFinite(n) ? n : NaN;
}
function adviesParseDegiroApp(regels) {
  if (!regels.some(function (r) { return /×|\bTDG\b/.test(r); })) return [];
  var uit = [];
  var isNaam = function (r) { return /[A-Za-z]/.test(r) && !/^[€+\-−]/.test(r.trim()) && !/×|\bTDG\b|Koers|Dag \+|Trackers|Open$|Portefeuille/i.test(r) && /UCITS|ETF|ETN|ETC|Fund|Fonds|Index|Tracker/i.test(r); };
  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (!isNaam(r)) continue;
    var naam = r.replace(/\s*€\s*\d[\d.]*,\d{2}\s*$/, "").trim();
    var j = i + 1;
    while (j < regels.length && regels[j].trim().length <= 12 && /[A-Za-z(]/.test(regels[j]) && !/[€×]/.test(regels[j])) { naam += " " + regels[j].trim(); j++; }
    var waarde = NaN;
    var zelfde = r.match(/€\s*(\d[\d.]*,\d{2})\s*$/);
    if (zelfde) waarde = adviesGetal(zelfde[1]);
    for (var k = j; k < Math.min(regels.length, j + 4) && !(waarde > 0); k++) {
      var x = regels[k].trim();
      var w = x.match(/^€\s*(\d[\d.]*,\d{2})$/);
      if (w) { waarde = adviesGetal(w[1]); break; }
      var pq = x.match(/€\s*(\d[\d.]*,\d+)\s*×\s*(\d+)/);
      if (pq) waarde = Math.round(adviesGetal(pq[1]) * Number(pq[2]) * 100) / 100;
    }
    if (waarde > 0) uit.push({ naam: naam, waarde: waarde, isin: "" });
    i = j - 1;
  }
  return uit;
}
function adviesParseUpload(tekst) {
  var regels = String(tekst || "").split(/\r?\n/).filter(function (r) { return r.trim(); });
  if (!regels.length) return [];
  var appLijst = adviesParseDegiroApp(regels);
  if (appLijst.length) return appLijst;
  var scheiding = [";", "\t", ","].map(function (s) { return [s, (regels[0].match(new RegExp(s === "\t" ? "\t" : "\\" + s, "g")) || []).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0];
  var sp = scheiding[1] > 1 ? scheiding[0] : null;
  var splits = function (r) {
    var uit = [], cur = "", q = false;
    for (var i = 0; i < r.length; i++) {
      var c = r[i];
      if (c === '"') q = !q;
      else if (c === sp && !q) { uit.push(cur); cur = ""; }
      else cur += c;
    }
    uit.push(cur);
    return uit.map(function (x) { return x.trim(); });
  };
  var sluit = function (naam) { return /cash|geldmarktfonds|flatex|totaal|total/i.test(naam); };
  var isinIn = function (s) { return (String(s).match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/) || [""])[0]; };
  var uit = [];
  if (sp) {
    var kop = splits(regels[0]).map(function (x) { return x.toLowerCase(); });
    var iNaam = kop.findIndex(function (x) { return /^(product|naam|name)$/.test(x); });
    var iIsin = kop.findIndex(function (x) { return /isin/.test(x); });
    var iWaarde = -1;
    kop.forEach(function (x, i) { if (/waarde|value/.test(x) && /eur/.test(x)) iWaarde = i; });
    if (iWaarde < 0) kop.forEach(function (x, i) { if (/waarde|value/.test(x)) iWaarde = i; });
    if (iNaam >= 0 && iWaarde >= 0) {
      regels.slice(1).forEach(function (r) {
        var c = splits(r), naam = c[iNaam] || "", w = adviesGetal(c[iWaarde]);
        if (naam && !sluit(naam) && w > 0) uit.push({ naam: naam, waarde: w, isin: iIsin >= 0 ? isinIn(c[iIsin]) : isinIn(r) });
      });
      if (uit.length) return uit;
    }
  }
  regels.forEach(function (r) {
    var mm = r.match(/^(.*?)[\s;:]+(?:€\s*)?(-?\d[\d.,]*)\s*(?:€|eur)?\s*$/i);
    if (!mm) return;
    var naam = mm[1].replace(/[;,\t]+$/g, "").trim(), w = adviesGetal(mm[2]);
    if (naam && !sluit(naam) && w > 0) uit.push({ naam: naam, waarde: w, isin: isinIn(r) });
  });
  return uit;
}
