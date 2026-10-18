/* ===== Fiscaliteit: tabel per jaar, belasting, kortingen, AOW ===== */
// Werkwijze bij een release: zet FISCAAL_TABEL_STAND op de datum, werk het laatste jaar bij of voeg een jaar toe.
// Bronnen: tarieven en kortingen = Belastingdienst; AOW-bedragen = SVB (januari en juli); Zvw = Belastingdienst; CPI = CBS.
// Een jaar geldt vanaf 1 januari; eerdere jaren rekenen met hun eigen waarden.
var FISCAAL_TABEL_STAND = "2026-10-18";
var FISCAAL_PER_JAAR = {
  2026: {
    status: "definitief", bron: "Belastingdienst, SVB (AOW per 1 juli 2026)",
    w: {
      schijf1_max: 38883, schijf2_max: 78426,
      tarief1: 35.75, tarief1_aow: 17.85, tarief2: 37.56, tarief3: 49.5,
      algemene_heffingskorting_max: 3115, ahk_afbouwgrens: 29736, ahk_afbouwpct: 6.398,
      ouderenkorting_max: 2067, ouderenkorting_afbouwgrens: 46002, ouderenkorting_afbouwpct: 15,
      ahk_na_aow_max: 1556, ahk_na_aow_afbouwpct: 3.195,
      arbeidskorting_max: 5685, arbeidskorting_afbouwgrens: 45592, arbeidskorting_afbouwpct: 6.51,
      zvw_laag_pct: 4.85, zvw_max_bijdrage_inkomen: 79409,
      max_jaaruitkering_tijdelijke_lijfrente_5_20jr: 27192,
      aow_bruto_gehuwd_pm: 1139.39, aow_vakantiegeld_gehuwd_pm: 74.85,
      aow_bruto_alleen_pm: 1662.16, aow_vakantiegeld_alleen_pm: 104.78,
      kinderbijslag_0_5: 298.40, kinderbijslag_6_11: 362.35, kinderbijslag_12_17: 426.29,
      box3_tarief: 36, box3_vrij_pp: 59357, box3_sparen_pct: 1.28, box3_beleggen_pct: 6.00, box3_schuld_pct: 2.70
    }
  },
  2027: {
    // Belastingplan 2027: voorstel van 15-9-2026, definitief na akkoord van beide Kamers (eind december).
    // Zvw, maximale jaaruitkering lijfrente, AOW en box 3 voor 2027 zijn nog niet bekend: stand 2026 aangehouden.
    status: "voorstel", bron: "Belastingplan 2027 (Rijksoverheid.nl)",
    w: {
      schijf1_max: 39247, schijf2_max: 78426,
      tarief1: 36.23, tarief1_aow: 18.33, tarief2: 38.16, tarief3: 49.5,
      algemene_heffingskorting_max: 3154, ahk_afbouwgrens: 30910, ahk_afbouwpct: 6.638,
      ouderenkorting_max: 1993, ouderenkorting_afbouwgrens: 46577, ouderenkorting_afbouwpct: 15,
      ahk_na_aow_max: 1596, ahk_na_aow_afbouwpct: 3.359,
      arbeidskorting_max: 5929, arbeidskorting_afbouwgrens: 47834, arbeidskorting_afbouwpct: 6.51,
      zvw_laag_pct: 4.85, zvw_max_bijdrage_inkomen: 79409,
      max_jaaruitkering_tijdelijke_lijfrente_5_20jr: 27192,
      aow_bruto_gehuwd_pm: 1139.39, aow_vakantiegeld_gehuwd_pm: 74.85,
      aow_bruto_alleen_pm: 1662.16, aow_vakantiegeld_alleen_pm: 104.78,
      kinderbijslag_0_5: 298.40, kinderbijslag_6_11: 362.35, kinderbijslag_12_17: 426.29,
      box3_tarief: 36, box3_vrij_pp: 59357, box3_sparen_pct: 1.28, box3_beleggen_pct: 6.00, box3_schuld_pct: 2.70
    }
  }
};
var FISCAAL_JAREN = Object.keys(FISCAAL_PER_JAAR).map(Number).sort(function (a, b) { return a - b; });
var FISCAAL_LAATSTE_JAAR = FISCAAL_JAREN[FISCAAL_JAREN.length - 1];
// Na het laatste jaar van de tabel: indexatie van schijven en kortingen per 1 januari. Jaren in deze lijst gebruiken dit
// percentage; andere jaren gebruiken de eigen aanname (instelling 'indexSchijven').
var FISCAAL_INDEXATIE_BIJZONDER = { 2028: { pct: 0.3, toelichting: "beperkte correctie, aanname circa 0,3%" } };
var FISCAAL_BEDRAGVELDEN = ["schijf1_max", "schijf2_max", "algemene_heffingskorting_max", "ahk_afbouwgrens", "ouderenkorting_max", "ouderenkorting_afbouwgrens", "ahk_na_aow_max", "arbeidskorting_max", "arbeidskorting_afbouwgrens", "zvw_max_bijdrage_inkomen", "max_jaaruitkering_tijdelijke_lijfrente_5_20jr", "box3_vrij_pp"];
var FISCAAL_AOWVELDEN = ["aow_bruto_gehuwd_pm", "aow_vakantiegeld_gehuwd_pm", "aow_bruto_alleen_pm", "aow_vakantiegeld_alleen_pm", "kinderbijslag_0_5", "kinderbijslag_6_11", "kinderbijslag_12_17"];
var FISCAAL_LABELS = {
  schijf1_max: ["Einde eerste schijf (€ per jaar)", "b"], schijf2_max: ["Einde tweede schijf (€ per jaar)", "b"],
  tarief1: ["Tarief eerste schijf voor AOW (%)", "p"], tarief1_aow: ["Tarief eerste schijf vanaf AOW (%)", "p"], tarief2: ["Tarief tweede schijf (%)", "p"], tarief3: ["Tarief derde schijf (%)", "p"],
  algemene_heffingskorting_max: ["Algemene heffingskorting, maximaal", "b"], ahk_afbouwgrens: ["Algemene heffingskorting: afbouw vanaf inkomen", "b"], ahk_afbouwpct: ["Algemene heffingskorting: afbouw (%)", "p"],
  ahk_na_aow_max: ["Algemene heffingskorting vanaf AOW, maximaal", "b"], ahk_na_aow_afbouwpct: ["Algemene heffingskorting vanaf AOW: afbouw (%)", "p"],
  ouderenkorting_max: ["Ouderenkorting, maximaal", "b"], ouderenkorting_afbouwgrens: ["Ouderenkorting: afbouw vanaf inkomen", "b"], ouderenkorting_afbouwpct: ["Ouderenkorting: afbouw (%)", "p"],
  arbeidskorting_max: ["Arbeidskorting, maximaal", "b"], arbeidskorting_afbouwgrens: ["Arbeidskorting: afbouw vanaf inkomen", "b"], arbeidskorting_afbouwpct: ["Arbeidskorting: afbouw (%)", "p"],
  zvw_laag_pct: ["Zvw-bijdrage op pensioen (%)", "p"], zvw_max_bijdrage_inkomen: ["Zvw: maximaal bijdrage-inkomen", "b"],
  max_jaaruitkering_tijdelijke_lijfrente_5_20jr: ["Maximale jaaruitkering tijdelijke lijfrente (5 tot 20 jaar)", "b"],
  aow_bruto_gehuwd_pm: ["AOW bruto per maand, per persoon (met partner)", "b"], aow_vakantiegeld_gehuwd_pm: ["AOW-vakantiegeld per maand, per persoon (met partner)", "b"],
  aow_bruto_alleen_pm: ["AOW bruto per maand (alleenstaand)", "b"], aow_vakantiegeld_alleen_pm: ["AOW-vakantiegeld per maand (alleenstaand)", "b"],
  kinderbijslag_0_5: ["Kinderbijslag per kwartaal, kind van 0 tot en met 5 jaar", "b"], kinderbijslag_6_11: ["Kinderbijslag per kwartaal, kind van 6 tot en met 11 jaar", "b"], kinderbijslag_12_17: ["Kinderbijslag per kwartaal, kind van 12 tot en met 17 jaar", "b"],
  box3_tarief: ["Box 3: tarief (%)", "p"], box3_vrij_pp: ["Box 3: heffingsvrij vermogen per persoon", "b"], box3_sparen_pct: ["Box 3: fictief rendement sparen (%)", "p"], box3_beleggen_pct: ["Box 3: fictief rendement beleggen (%)", "p"], box3_schuld_pct: ["Box 3: rente op schulden (%)", "p"]
};

// De tabel: ingebouwde cijfers, aangevuld of vervangen door nieuwere cijfers die via 'Cijfers bijwerken' zijn opgehaald.
function fiscaalTabel(m) {
  if (m._ft) return m._ft;
  var perJaar = Object.assign({}, FISCAAL_PER_JAAR), stand = FISCAAL_TABEL_STAND, c = m.cijfers || {};
  if (c.fiscaal && c.versie && c.versie >= FISCAAL_TABEL_STAND) {
    Object.keys(c.fiscaal).forEach(function (j) { if (c.fiscaal[j] && c.fiscaal[j].w) perJaar[j] = c.fiscaal[j]; });
    stand = c.versie;
  }
  var jaren = Object.keys(perJaar).map(Number).sort(function (a, b) { return a - b; });
  m._ft = { perJaar: perJaar, jaren: jaren, laatste: jaren[jaren.length - 1], stand: stand };
  return m._ft;
}
function fiscaalJaar(m, jaar) {
  m._fx = m._fx || {};
  if (m._fx[jaar]) return m._fx[jaar];
  var T = fiscaalTabel(m);
  var kies = T.jaren[0];
  T.jaren.forEach(function (j) { if (j <= jaar) kies = j; });
  var w = Object.assign({}, T.perJaar[kies].w, (m.fiscOverride || {})[kies] || {});
  var f = 1, fAow = 1;
  for (var j = kies + 1; j <= jaar; j++) {
    var bz = FISCAAL_INDEXATIE_BIJZONDER[j];
    f *= 1 + (bz ? bz.pct : getal(m.inst.indexSchijven)) / 100;
    fAow *= 1 + getal(m.inst.indexAOW) / 100;
  }
  var uit = Object.assign({}, w);
  FISCAAL_BEDRAGVELDEN.forEach(function (k) { uit[k] = getal(w[k]) * f; });
  FISCAAL_AOWVELDEN.forEach(function (k) { uit[k] = getal(w[k]) * fAow; });
  uit._basisjaar = kies; uit._status = T.perJaar[kies].status; uit._geindexeerd = jaar > kies; uit._bron = T.perJaar[kies].bron;
  m._fx[jaar] = uit;
  return uit;
}
function fx(m, datum) { return fiscaalJaar(m, datum.getFullYear()); }

function belastingBox1(f, inkomen, naAOW) {
  if (inkomen <= 0) return 0;
  var t1 = getal(naAOW ? f.tarief1_aow : f.tarief1) / 100, t2 = getal(f.tarief2) / 100, t3 = getal(f.tarief3) / 100;
  var s1 = getal(f.schijf1_max), s2 = getal(f.schijf2_max);
  if (inkomen <= s1) return inkomen * t1;
  if (inkomen <= s2) return s1 * t1 + (inkomen - s1) * t2;
  return s1 * t1 + (s2 - s1) * t2 + (inkomen - s2) * t3;
}
function algemeneHeffingskorting(f, vi, naAOW) {
  var max = getal(naAOW ? f.ahk_na_aow_max : f.algemene_heffingskorting_max);
  var p = getal(naAOW ? f.ahk_na_aow_afbouwpct : f.ahk_afbouwpct) / 100;
  return Math.max(0, max - Math.max(0, vi - getal(f.ahk_afbouwgrens)) * p);
}
function ouderenkorting(f, vi, naAOW) {
  if (!naAOW) return 0;
  return Math.max(0, getal(f.ouderenkorting_max) - Math.max(0, vi - getal(f.ouderenkorting_afbouwgrens)) * getal(f.ouderenkorting_afbouwpct) / 100);
}
// Alleen het afbouwtraject is gemodelleerd; bij lagere inkomens is dit een bovengrens (zie Aannames).
function arbeidskorting(f, arbeid) {
  if (arbeid <= 0) return 0;
  var grens = getal(f.arbeidskorting_afbouwgrens);
  if (arbeid <= grens) return getal(f.arbeidskorting_max);
  return Math.max(0, getal(f.arbeidskorting_max) - (arbeid - grens) * getal(f.arbeidskorting_afbouwpct) / 100);
}
function zvwBijdrage(f, bruto) { return Math.min(Math.max(0, bruto), getal(f.zvw_max_bijdrage_inkomen)) * getal(f.zvw_laag_pct) / 100; }

// Belasting, kortingen en netto per jaar voor één persoon.
function jaarBerekening(m, bruto, arbeid, naAOW, datum) {
  bruto = Math.max(0, bruto); arbeid = Math.max(0, Math.min(arbeid || 0, bruto));
  var f = fx(m, datum);
  var bel = belastingBox1(f, bruto, naAOW);
  var kort = algemeneHeffingskorting(f, bruto, naAOW) + ouderenkorting(f, bruto, naAOW) + arbeidskorting(f, arbeid);
  var zvw = zvwBijdrage(f, bruto);
  var toegepast = Math.min(bel, kort);
  return { bruto: bruto, belasting: bel, korting: kort, kortingToegepast: toegepast, zvw: zvw, netto: Math.max(0, bruto - (bel - toegepast) - zvw) };
}
function nettoJaarPersoon(m, bruto, arbeid, naAOW, datum) { return bruto <= 0 ? 0 : jaarBerekening(m, bruto, arbeid, naAOW, datum).netto; }

/* ---------- AOW ---------- */
// Verwachte AOW-leeftijd (SVB/Rijksoverheid): tot en met 2027 67 jaar, 2028 tot en met 2031 67 jaar en 3 maanden,
// geboren 1-10-1966 tot en met 30-6-1970 67 jaar en 6 maanden. Latere jaren zijn nog niet vastgesteld.
function aowDatumBerekend(geb) {
  var g = geldigeDatum(geb);
  if (!g) return null;
  var d67 = plusJaren(g, 67);
  if (d67 <= new Date(2027, 11, 31)) return d67;
  var mnd = 3;
  if (g >= new Date(1966, 9, 1)) mnd = 6;
  return plusMaanden(g, 67 * 12 + mnd);
}
function aowLeeftijdTekst(geb) {
  var g = geldigeDatum(geb), a = aowDatumBerekend(geb);
  if (!g || !a) return "";
  var mnd = maandenTussen(g, a) - (a.getDate() < g.getDate() ? 1 : 0);
  var j = Math.floor(mnd / 12), r = mnd % 12;
  return j + " jaar" + (r ? " en " + r + " maanden" : "");
}
function aowStatusTekst(geb, nu) {
  var a = aowDatumBerekend(geb);
  if (!a) return "";
  return a.getFullYear() > nu.getFullYear() + 5 ? "Verwacht: de AOW-leeftijd voor jouw geboortejaar wordt pas vijf jaar van tevoren vastgesteld." : "";
}
function aowBrutoMaand(m, datum) {
  var f = fx(m, datum), partner = m.profiel.partner && m.profiel.fiscalePartners !== false;
  return getal(partner ? f.aow_bruto_gehuwd_pm : f.aow_bruto_alleen_pm) + getal(partner ? f.aow_vakantiegeld_gehuwd_pm : f.aow_vakantiegeld_alleen_pm);
}

function fiscaalWaarschuwingen(m, nu) {
  var uit = [], T = fiscaalTabel(m);
  var jaar = nu.getFullYear(), nodig = nu.getMonth() >= 8 ? jaar + 1 : jaar;
  if (T.laatste < nodig) uit.push("De fiscale tabel loopt tot " + T.laatste + ". Cijfers voor " + nodig + " ontbreken; de app rekent met indexatie. Druk op 'Cijfers bijwerken'.");
  var bezig = T.perJaar[Math.min(jaar, T.laatste)];
  if (bezig && bezig.status !== "definitief") uit.push("Fiscale cijfers voor " + Math.min(jaar, T.laatste) + " staan als '" + bezig.status + "'. Druk later op 'Cijfers bijwerken' om te controleren of ze definitief zijn.");
  var nxt = T.perJaar[jaar + 1];
  if (nxt && nxt.status !== "definitief") uit.push("De cijfers voor " + (jaar + 1) + " zijn nog een voorstel (Belastingplan). Ze worden definitief na akkoord van beide Kamers.");
  return uit;
}

// Box 3 (indicatie): forfaitair rendement over bank- en beleggingsvermogen, na heffingsvrij vermogen.
function box3Indicatie(m, bank, beleggen, overig, schuld, datum) {
  var f = fx(m, datum);
  var b3 = m.box3 || {};
  var tarief = b3.tarief != null && b3.tarief !== "" ? getal(b3.tarief) : getal(f.box3_tarief);
  var vrij = (b3.vrijPP != null && b3.vrijPP !== "" ? getal(b3.vrijPP) : getal(f.box3_vrij_pp)) * (m.profiel.partner ? 2 : 1);
  var fs = b3.sparenPct != null && b3.sparenPct !== "" ? getal(b3.sparenPct) : getal(f.box3_sparen_pct);
  var fb = b3.beleggenPct != null && b3.beleggenPct !== "" ? getal(b3.beleggenPct) : getal(f.box3_beleggen_pct);
  var totaal = Math.max(0, bank) + Math.max(0, beleggen) + Math.max(0, overig) - Math.max(0, schuld);
  var rendement = bank * fs / 100 + (beleggen + overig) * fb / 100 - schuld * getal(f.box3_schuld_pct) / 100;
  var eff = totaal > 0 ? Math.max(0, rendement) / totaal : 0;
  var grondslag = Math.max(0, totaal - vrij);
  if (b3.stelsel === "werkelijk") {
    // Beoogd vanaf 2028, nog onzeker: belasting over het werkelijke rendement (eigen aannames uit Instellingen).
    var wr = bank * getal(m.inst.spaarrente) / 100 + (beleggen + overig) * getal(m.inst.rendBeleggen) / 100 - schuld * getal(f.box3_schuld_pct) / 100;
    return { totaal: totaal, vrij: 0, rendement: wr, grondslag: Math.max(0, wr), belasting: Math.max(0, wr) * tarief / 100, tarief: tarief, effectief: totaal > 0 ? wr / totaal * 100 : 0, werkelijk: true };
  }
  return { totaal: totaal, vrij: vrij, rendement: rendement, grondslag: grondslag, belasting: grondslag * eff * tarief / 100, tarief: tarief, effectief: eff * 100 };
}
