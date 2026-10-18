/* ===== Rekenmotor: inkomen, lasten, pensioen, spaargeld, vermogen. Geen React. ===== */

// Het model: alle opgeslagen gegevens plus afgeleide waarden. 'nu' is vandaag, 'peil' de peildatum van de berekening.
function maakModel(S, nu) {
  var m = Object.assign({}, S);
  m.nu = nu;
  m.peil = geldigeDatum(S.profiel.peildatum) || nu;
  var p = S.profiel;
  var lab = p.type ? labelsVoorType(p.type) : [p.naamA || "Persoon A", p.naamB || "Persoon B"];
  m.personen = [{ id: "A", naam: lab[0], geb: geldigeDatum(p.geboorteA), aow: geldigeDatum(p.aowA) || aowDatumBerekend(p.geboorteA) }];
  if (p.partner) m.personen.push({ id: "B", naam: lab[1] || "Persoon B", geb: geldigeDatum(p.geboorteB), aow: geldigeDatum(p.aowB) || aowDatumBerekend(p.geboorteB) });
  m.bronnen = (S.bronnen || []).filter(function (b) { return p.partner || b.persoon !== "B"; });
  m.potten = (S.potten || []).filter(function (b) { return p.partner || b.persoon !== "B"; });
  // Spaarrekeningen: totaal saldo en gewogen rente.
  var rek = (S.verm.rekeningen || []), totaal = 0, wr = 0;
  rek.forEach(function (r) { var sd = getal(r.saldo); totaal += sd; wr += sd * (r.rente === "" || r.rente == null ? getal(S.inst.spaarrente) : getal(r.rente)); });
  m.verm = Object.assign({}, S.verm, { spaar: totaal });
  m.inst = Object.assign({}, S.inst, { spaarrente: totaal > 0 ? wr / totaal : getal(S.inst.spaarrente) });
  m.cijfers = S.cijfers || {};
  m.spaarStandaard = getal(S.inst.spaarrente);
  m._cache = {};
  // Inkomensaanvulling: de gebruiker geeft het gewenste maandbedrag; de app berekent het benodigde kapitaal en reserveert dat uit spaargeld of beleggingen.
  m.aanv = Object.assign({}, S.aanv);
  m.aanvB = null;
  if (p.gebruik.aanvulling) {
    var b = aanvulBeoordeling(m);
    m.aanvB = b;
    m.aanv.startsaldo = b.K; m.aanv.rendement = b.rBron; m.aanv.kosten = 0;
    m.aanv.opnameVanaf = isoDatum(b.start); m.aanv.einde = b.eind ? isoDatum(b.eind) : ""; m.aanv.opnameAan = b.X > 0;
    if (b.bron === "sparen") m.verm = Object.assign({}, m.verm, { spaar: m.verm.spaar - b.K });
  }
  return m;
}
// Toetst de gewenste aanvulling aan spaargeld (boven de buffer) en vrije beleggingen, bij een standaard rendement.
function aanvulBeoordeling(m) {
  var a = m.aanv, gb = m.profiel.gebruik;
  var start = geldigeDatum(a.opnameVanaf) || m.peil; if (start < m.peil) start = m.peil;
  var eind = null;
  if (a.totType === "datum") eind = geldigeDatum(a.einde);
  else { var ps = persoonVan(m, a.totPersoon || "A"); eind = ps && ps.aow; }
  var L = eind ? Math.max(0, maandenTussen(eerstVanMaand(start), eerstVanMaand(eind))) : 0;
  var X = getal(a.maand), rS = getal(m.inst.spaarrente), rB = getal(m.inst.rendBeleggen);
  function pv(r) { var i = r / 1200; return L <= 0 ? 0 : (i === 0 ? X * L : X * (1 - Math.pow(1 + i, -L)) / i); }
  var buffer = getal(m.grote.minimum);
  var besS = Math.max(0, getal(m.verm.spaar) - buffer);
  var besB = gb.beleggen ? (m.verm.beleggingen || []).filter(function (x) { return x.soort === "vrij"; }).reduce(function (s, x) { return s + getal(x.waarde); }, 0) : 0;
  var bron = a.bron === "beleggen" && gb.beleggen ? "beleggen" : "sparen";
  var nodigS = pv(rS), nodigB = pv(rB);
  var K = Math.min(bron === "sparen" ? nodigS : nodigB, bron === "sparen" ? besS : besB);
  return { X: X, L: L, start: start, eind: eind, rS: rS, rB: rB, nodigS: nodigS, nodigB: nodigB, besS: besS, besB: besB, buffer: buffer,
    kanS: L > 0 && X > 0 && besS >= nodigS - 0.5, kanB: L > 0 && X > 0 && besB >= nodigB - 0.5,
    maxXS: annuiteit(besS, rS, L), maxXB: annuiteit(besB, rB, L), bron: bron, K: Math.max(0, K), rBron: bron === "sparen" ? rS : rB };
}
function persoonVan(m, id) { return m.personen.filter(function (x) { return x.id === id; })[0] || m.personen[0]; }
function naAOW(p, d) { return !!(p && p.aow && d >= eerstVanMaand(p.aow)); }

// Een bron of post telt voor hele maanden mee. d = eerste dag van de maand.
// Starten in die maand telt volledig; een einddatum op de 1e van de maand telt die maand niet meer mee.
function periodeActief(start, einde, d) {
  var s = geldigeDatum(start), e = geldigeDatum(einde);
  if (s && s > laatsteVanMaand(d)) return false;
  if (e && e <= d) return false;
  return true;
}

/* ---------- Indexatie ---------- */
function jaarFactor(m, index, indexPct, d) {
  var n = Math.max(0, d.getFullYear() - m.peil.getFullYear());
  var p = index === "cpi" ? getal(m.inst.cpi) : index === "vast" ? getal(indexPct) : 0;
  return Math.pow(1 + p / 100, n);
}
function cpiIjkpunt(m) { return geldigeDatum((m.inst.cpiIjk || "") + "-01") || eerstVanMaand(m.peil); }
// Vaste lasten en dagelijkse uitgaven: 1/12 van het jaarpercentage per maand vanaf het ijkpunt.
function maandFactor(m, index, indexPct, d) {
  var n = Math.max(0, maandenTussen(cpiIjkpunt(m), d));
  var p = index === "cpi" ? getal(m.inst.cpi) : index === "vast" ? getal(indexPct) : 0;
  return Math.pow(1 + p / 1200, n);
}

/* ---------- Pensioenpotten en lijfrente ---------- */
function annuiteit(kapitaal, rendPct, maanden) {
  if (kapitaal <= 0 || maanden <= 0) return 0;
  var i = rendPct / 1200;
  return i === 0 ? kapitaal / maanden : kapitaal * i / (1 - Math.pow(1 + i, -maanden));
}
function potPlan(m, pot) {
  m._cache.pot = m._cache.pot || {};
  if (m._cache.pot[pot.id]) return m._cache.pot[pot.id];
  var pers = persoonVan(m, pot.persoon);
  var s0 = geldigeDatum(pot.start) || pers.aow, blok = geldigeDatum(pot.geblokkeerdTot);
  var uit = null;
  if (s0) {
    var start = blok && blok > s0 ? blok : s0;
    if (start < m.peil) start = m.peil;
    var n = Math.max(0, maandenTussen(m.peil, start));
    var g = 1 + getal(pot.rendVoor) / 1200;
    var inlegTot = geldigeDatum(pot.inlegTot) || start;
    var nInleg = Math.max(0, Math.min(n, maandenTussen(m.peil, inlegTot)));
    var kap = getal(pot.saldo) * Math.pow(g, n);
    var im = getal(pot.inleg) / 12;
    for (var k = 0; k < nInleg; k++) kap += im * Math.pow(g, n - 1 - k);
    var L = Math.max(1, Math.round(getal(pot.looptijd) * 12));
    var maand = annuiteit(kap, getal(pot.rendTijdens), L);
    uit = { start: start, eind: plusMaanden(start, L), L: L, kapitaalStart: kap, maand: maand, n: n };
  }
  m._cache.pot[pot.id] = uit;
  return uit;
}
function potSaldoOp(m, pot, d) {
  var pl = potPlan(m, pot);
  if (!pl) return getal(pot.saldo);
  var gV = getal(pot.rendVoor) / 1200, iT = getal(pot.rendTijdens) / 1200;
  if (d < pl.start) {
    var n = Math.max(0, maandenTussen(m.peil, d));
    var g = 1 + gV, s = getal(pot.saldo) * Math.pow(g, n);
    var inlegTot = geldigeDatum(pot.inlegTot) || pl.start;
    var nI = Math.max(0, Math.min(n, maandenTussen(m.peil, inlegTot)));
    for (var k = 0; k < nI; k++) s += getal(pot.inleg) / 12 * Math.pow(g, n - 1 - k);
    return s;
  }
  if (d >= pl.eind) return 0;
  var t = Math.max(0, maandenTussen(pl.start, d));
  var f = Math.pow(1 + iT, t);
  return iT === 0 ? pl.kapitaalStart - pl.maand * t : Math.max(0, pl.kapitaalStart * f - pl.maand * (f - 1) / iT);
}

/* ---------- Kinderbijslag (SVB): per kind, per kwartaal, achteraf betaald ---------- */
function kwartaalStart(d) { return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1); }
function kwartaalEind(d) { var q = kwartaalStart(d); return new Date(q.getFullYear(), q.getMonth() + 3, 0); }
// Bedrag voor het kwartaal dat op qStart begint: stopt als het kind op de eerste dag 18 is; leeftijdsgroep naar de leeftijd aan het einde van het kwartaal.
function kinderbijslagKwartaal(m, geboorte, qStart, dubbel) {
  var g = geldigeDatum(geboorte); if (!g) return 0;
  var qEind = kwartaalEind(qStart);
  if (g > qEind) return 0;
  if (leeftijdJaren(g, qStart) >= 18) return 0;
  var a = leeftijdJaren(g, qEind), f = fx(m, qEind);
  var bedrag = getal(a >= 12 ? f.kinderbijslag_12_17 : a >= 6 ? f.kinderbijslag_6_11 : f.kinderbijslag_0_5);
  // Dubbele kinderbijslag: kind van 3 tot en met 17 met een beperking en intensieve zorg (Wlz-indicatie of CIZ-advies), thuiswonend.
  return dubbel && a >= 3 ? bedrag * 2 : bedrag;
}
function kinderbijslagMaand(m, d, kas) {
  var kids = (m.profiel.kids || []), L = lijstL(m.profiel);
  if (!L.kbAuto) return 0;
  var kb = 0;
  kids.forEach(function (k) {
    if (kas) { if (d.getMonth() % 3 === 0) kb += kinderbijslagKwartaal(m, k.geboorte, new Date(d.getFullYear(), d.getMonth() - 3, 1), k.beperking); }
    else kb += kinderbijslagKwartaal(m, k.geboorte, kwartaalStart(d), k.beperking) / 3;
  });
  return kb;
}
// Laatste kwartaal met kinderbijslag voor dit kind (einddatum van dat kwartaal).
function kinderbijslagLaatsteKwartaalEind(geboorte) {
  var g = geldigeDatum(geboorte); if (!g) return null;
  var d18 = plusJaren(g, 18), q = kwartaalStart(d18);
  if (d18.getTime() === q.getTime()) q = new Date(q.getFullYear(), q.getMonth() - 3, 1);
  return kwartaalEind(q);
}
// Einde voortgezet onderwijs-start: kinderopvang (BSO) loopt tot ongeveer 1 augustus van het jaar waarin het kind naar de middelbare school gaat.
function bsoEindeDatum(geboorte) {
  var g = geldigeDatum(geboorte); if (!g) return null;
  return new Date(g.getFullYear() + 12 + (g.getMonth() >= 9 ? 1 : 0), 7, 1);
}

/* ---------- Inkomen per persoon en huishouden ---------- */
function bronBedrag(m, b, d) {
  var wijzig = geldigeDatum(b.wijzigDatum);
  var gebruikWijzig = wijzig && d >= eerstVanMaand(wijzig) && ((b.wijzigBruto !== "" && b.wijzigBruto != null) || (b.wijzigNetto !== "" && b.wijzigNetto != null));
  var bruto = gebruikWijzig ? b.wijzigBruto : b.bruto;
  var netto = gebruikWijzig ? b.wijzigNetto : b.netto;
  var wt = b.soort === "loon" && b.werktijd !== "" && b.werktijd != null ? getal(b.werktijd) / 100 : 1;
  var fac = jaarFactor(m, b.index, b.indexPct, d) * wt;
  return { bruto: getal(bruto) * fac, netto: (netto === "" || netto == null) ? null : getal(netto) * fac };
}
function bronActief(m, b, d, pers) {
  if (!periodeActief(b.start, b.einde, d)) return false;
  if (b.soort === "loon") {
    if (naAOW(pers, d)) return false;
    var wj = (m.werkJaren || {})[b.persoon] || {};
    if (wj[d.getFullYear()] === false) return false;
  }
  return true;
}
// kas = true: bedragen van toeslagen met een eigen betaalritme (bijv. kinderbijslag per kwartaal) vallen in de betaalmaand.
function persoonMaandBasis(m, pid, d, kas) {
  var sleutel = pid + "|" + isoDatum(d) + "|" + (kas ? 1 : 0);
  m._cache.pm = m._cache.pm || {};
  if (m._cache.pm[sleutel]) return m._cache.pm[sleutel];
  var pers = persoonVan(m, pid), na = naAOW(pers, d);
  var lijst = [], vrijNetto = 0;
  m.bronnen.forEach(function (b) {
    if (b.persoon !== pid || !bronActief(m, b, d, pers)) return;
    var v = bronBedrag(m, b, d);
    if (b.soort === "toeslag") {
      var bedrag = v.netto != null ? v.netto : v.bruto, f = b.freq || "maand";
      var perMaand = !kas ? bedrag * FREQ_PER_JAAR[f] / 12 : (postBetaaldInMaand({ freq: f, eersteMaand: b.eersteMaand }, d) ? bedrag : 0);
      lijst.push({ naam: b.naam || SOORT_NAAM.toeslag, soort: "toeslag", bruto: perMaand, netto: perMaand, vrij: true });
      vrijNetto += perMaand;
      return;
    }
    lijst.push({ id: b.id, naam: b.naam || SOORT_NAAM[b.soort], soort: b.soort, bruto: v.bruto, netto: v.netto });
  });
  if (pid === "A") {
    var kbm = kinderbijslagMaand(m, d, kas);
    if (kbm > 0) { lijst.push({ naam: "Kinderbijslag (automatisch)", soort: "toeslag", bruto: kbm, netto: kbm, vrij: true }); vrijNetto += kbm; }
  }
  if (na) lijst.push({ naam: "AOW", soort: "aow", bruto: aowBrutoMaand(m, d), netto: null });
  m.potten.forEach(function (pt) {
    if (pt.persoon !== pid) return;
    var pl = potPlan(m, pt);
    if (pl && d >= eerstVanMaand(pl.start) && d < eerstVanMaand(pl.eind) && pl.maand > 0) lijst.push({ naam: pt.naam || "Pensioenpot", soort: "pot", bruto: pl.maand, netto: null });
  });
  // Heffingskorting: automatisch toegepast op het hoogste inkomen van de persoon (loonheffingskorting geldt bij één uitkeerder).
  // Welke kortingen er gelden volgt uit leeftijd (AOW-leeftijd), arbeidsinkomen (loon of winst) en de hoogte van het inkomen.
  var brutoAlles = 0, arbeidAlles = 0, nettoGeg = 0, hoogste = null;
  lijst.forEach(function (x) {
    if (x.vrij) return;
    brutoAlles += x.bruto; if (x.soort === "loon") arbeidAlles += x.bruto;
    if (x.netto != null) nettoGeg += x.netto;
    if (!hoogste || x.bruto > hoogste.bruto) hoogste = x;
  });
  if (hoogste) hoogste.kortingHier = true;
  var modelleerd = lijst.filter(function (x) { return !x.vrij && x.netto == null; });
  var nettoModel = 0;
  if (modelleerd.length) nettoModel = Math.max(0, nettoJaarPersoon(m, brutoAlles * 12, arbeidAlles * 12, na, d) / 12 - nettoGeg);
  var modelBruto = modelleerd.reduce(function (s2, x) { return s2 + x.bruto; }, 0);
  lijst.forEach(function (x) { if (!x.vrij && x.netto == null) x.netto = modelBruto > 0 ? nettoModel * x.bruto / modelBruto : 0; });
  var res = { id: pid, naam: pers.naam, bruto: brutoAlles, netto: nettoGeg + nettoModel + vrijNetto, lijst: lijst, naAOW: na, kortingBij: hoogste ? hoogste.naam : "" };
  m._cache.pm[sleutel] = res;
  return res;
}

function persoonMaand(m, pid, d, kas) {
  var sleutel = pid + "|" + isoDatum(d) + "|" + (kas ? 1 : 0);
  m._cache.pw = m._cache.pw || {};
  if (m._cache.pw[sleutel]) return m._cache.pw[sleutel];
  var basis = persoonMaandBasis(m, pid, d, kas), v = hypVoordeel(m, d), uit = basis;
  if (v && v.pid === pid && Math.abs(v.maand) > 0.005) {
    uit = Object.assign({}, basis, { lijst: basis.lijst.concat([{ naam: v.maand > 0 ? "Hypotheekrenteaftrek (belastingvoordeel)" : "Eigenwoningforfait (belastingnadeel)", soort: "toeslag", bruto: v.maand, netto: v.maand, vrij: true }]), netto: basis.netto + v.maand });
  }
  m._cache.pw[sleutel] = uit;
  return uit;
}

// Inkomensaanvulling (pot): maandelijkse opname en saldo.
function aanvulPlan(m) {
  if (m._cache.aanv) return m._cache.aanv;
  var a = m.aanv, uit = [];
  if (!m.profiel.gebruik.aanvulling || !(getal(a.startsaldo) > 0 || (a.mutaties || []).length)) { m._cache.aanv = uit; return uit; }
  var saldo = getal(a.startsaldo), d0 = eerstVanMaand(m.peil);
  var vanaf = geldigeDatum(a.opnameVanaf) || m.peil, einde = geldigeDatum(a.einde);
  for (var k = 0; k <= 480; k++) {
    var d = plusMaanden(d0, k), dEind = laatsteVanMaand(d);
    var groei = saldo * (getal(a.rendement) - getal(a.kosten)) / 1200;
    var mut = 0;
    (a.mutaties || []).forEach(function (x) { var xd = geldigeDatum(x.datum); if (xd && xd >= d && xd <= dEind && xd > m.peil) mut += getal(x.bedrag); });
    var opname = 0;
    if (a.opnameAan && eerstVanMaand(vanaf) <= d && (!einde || einde > d)) opname = Math.min(getal(a.maand), Math.max(0, saldo + groei + mut));
    saldo = saldo + groei + mut - opname;
    uit.push({ d: d, opname: opname, saldo: saldo, mut: mut });
    if (saldo < 0) saldo = 0;
  }
  m._cache.aanv = uit;
  return uit;
}
function aanvulOp(m, d) {
  var pl = aanvulPlan(m), i = maandenTussen(eerstVanMaand(m.peil), d);
  return pl[i] || { opname: 0, saldo: 0, d: d };
}

function huishoudenMaand(m, d, kas) {
  var pers = m.personen.map(function (p) { return persoonMaand(m, p.id, d, kas); });
  var aanv = aanvulOp(m, d).opname;
  var netto = pers.reduce(function (s, p) { return s + p.netto; }, 0) + aanv;
  var bruto = pers.reduce(function (s, p) { return s + p.bruto; }, 0) + aanv;
  return { personen: pers, aanvulling: aanv, netto: netto, bruto: bruto };
}

/* ---------- Lasten ---------- */
// Eén hypotheekdeel op datum d. Na de renteherzieningsdatum geldt de verwachte nieuwe rente (leeg = dezelfde rente).
function hypDeelOp(m, dl, d) {
  var nul = { maandlast: 0, saldo: 0, aflossing: 0, rente: 0 };
  if (!(getal(dl.bedrag) > 0)) return nul;
  var n = Math.max(0, maandenTussen(m.peil, d));
  var einde = geldigeDatum(dl.aflosEinde), aflM = getal(dl.aflossing);
  var aantalAfl = einde ? Math.min(n, Math.max(0, maandenTussen(m.peil, einde))) : n;
  var saldo = Math.max(0, getal(dl.bedrag) - aflM * aantalAfl);
  if (saldo <= 0) return nul;
  var herz = geldigeDatum(dl.herzienDatum), rente0 = getal(dl.rente), renteNu = rente0;
  if (herz && !dl.variabel && d >= eerstVanMaand(herz) && dl.nieuweRente !== "" && dl.nieuweRente != null) renteNu = getal(dl.nieuweRente);
  var rente = saldo * renteNu / 1200;
  if (einde && d >= eerstVanMaand(einde)) return { maandlast: rente, saldo: saldo, aflossing: 0, rente: rente };
  var last = getal(dl.maandlast) + saldo * (renteNu - rente0) / 1200;
  return { maandlast: Math.max(0, last), saldo: saldo, aflossing: Math.min(aflM, saldo), rente: rente };
}
function hypOp(m, d) {
  var uit = { maandlast: 0, saldo: 0, aflossing: 0, rente: 0, saldoBox1: 0, saldoBox3: 0, renteBox1: 0, renteBox3: 0 };
  if (!m.profiel.gebruik.hypotheek) return uit;
  ((m.hyp || {}).delen || []).forEach(function (dl) {
    var r = hypDeelOp(m, dl, d);
    uit.maandlast += r.maandlast; uit.saldo += r.saldo; uit.aflossing += r.aflossing; uit.rente += r.rente;
    if (dl.box === "3") { uit.saldoBox3 += r.saldo; uit.renteBox3 += r.rente; } else { uit.saldoBox1 += r.saldo; uit.renteBox1 += r.rente; }
  });
  return uit;
}
// Risico per hypotheekdeel: wanneer wordt de rente herzien en wat kost 1 procentpunt meer?
function hypRisico(m) {
  var uit = [];
  if (!m.profiel.gebruik.hypotheek) return uit;
  ((m.hyp || {}).delen || []).forEach(function (dl, i) {
    if (!(getal(dl.bedrag) > 0)) return;
    var naam = "Hypotheekdeel " + (i + 1) + (dl.box === "3" ? " (box 3)" : dl.box === "1" ? " (box 1)" : "");
    if (dl.variabel) { uit.push({ naam: naam, variabel: true, impact: hypDeelOp(m, dl, m.peil).saldo * 0.01 / 12 }); return; }
    var herz = geldigeDatum(dl.herzienDatum);
    if (!herz) { uit.push({ naam: naam, onbekend: true }); return; }
    var saldoDan = hypDeelOp(m, dl, herz < m.peil ? m.peil : herz).saldo;
    uit.push({ naam: naam, datum: herz, maanden: maandenTussen(m.nu, herz), dagen: dagenTussen(m.nu, herz), saldoDan: saldoDan, impact: saldoDan * 0.01 / 12 });
  });
  return uit;
}
// Eigenwoningforfait (bijtelling) op basis van de WOZ-waarde.
function ewfBedrag(m, d) {
  var woz = getal(m.profiel.leef && m.profiel.leef.woz);
  if (woz <= 0) return 0;
  var f = fx(m, d), hg = getal(f.ewf_hoog_grens);
  if (woz > hg) return getal(f.ewf_hoog_vast) + (woz - hg) * getal(f.ewf_hoog_pct) / 100;
  var p = woz >= 75000 ? getal(f.ewf_pct) : woz >= 50000 ? 0.25 : woz >= 25000 ? 0.20 : woz >= 12500 ? 0.10 : 0;
  return woz * p / 100;
}
// Belastingvoordeel van de hypotheekrente (box 1), toegerekend aan de persoon met het hoogste inkomen.
// Rente minus eigenwoningforfait; aftrek is beperkt tot het tarief van de tweede schijf; bij een lage hypotheek geldt de Hillen-regeling.
function hypVoordeel(m, d) {
  m._cache.hv = m._cache.hv || {};
  var sleutel = isoDatum(d);
  if (m._cache.hv[sleutel] !== undefined) return m._cache.hv[sleutel];
  var res = null;
  if (m.profiel.leef && m.profiel.leef.woning === "koop" && m.profiel.gebruik.hypotheek && !(m.hyp && m.hyp.voordeelInNetto)) {
    var hy = hypOp(m, d), rente = hy.renteBox1 * 12, ewf = ewfBedrag(m, d);
    if (rente > 0 || ewf > 0) {
      var best = null;
      m.personen.forEach(function (p) { var pm = persoonMaandBasis(m, p.id, d, false); if (!best || pm.bruto > best.pm.bruto) best = { p: p, pm: pm }; });
      if (best && best.pm.bruto > 0) {
        var na = best.pm.naAOW, B = best.pm.bruto * 12, A = best.pm.lijst.filter(function (x) { return x.soort === "loon"; }).reduce(function (s2, x) { return s2 + x.bruto; }, 0) * 12;
        var f = fx(m, d);
        var tax = function (b) { var bel = belastingBox1(f, b, na), kort = algemeneHeffingskorting(f, b, na) + ouderenkorting(f, b, na) + arbeidskorting(f, Math.min(A, b)); return { bel: bel, kort: kort }; };
        var t0 = tax(B), net0 = t0.bel - Math.min(t0.bel, t0.kort), verschil = rente - ewf, voordeel;
        if (verschil >= 0) {
          var t1 = tax(Math.max(0, B - verschil)), delta = Math.min(t0.bel - t1.bel, verschil * getal(f.tarief2) / 100), bel1 = t0.bel - delta;
          voordeel = net0 - (bel1 - Math.min(bel1, t1.kort));
        } else {
          var bijt = -verschil * (1 - getal(f.hillen_pct) / 100), t2 = tax(B + bijt);
          voordeel = net0 - (t2.bel - Math.min(t2.bel, t2.kort));
        }
        res = { pid: best.p.id, maand: voordeel / 12, jaar: voordeel, verschil: verschil, rente: rente, ewf: ewf };
      }
    }
  }
  m._cache.hv[sleutel] = res;
  return res;
}
// Box 3-schuld: schulden plus hypotheekdelen die niet aan de eigen woning zijn besteed.
function schuldBox3(items, t) {
  return -t.schuld + items.filter(function (x) { return x.comp === "hypotheek" && x.box === "3"; }).reduce(function (s, x) { return s - x.waarde; }, 0);
}

function postBetaaldInMaand(p, d) {
  var f = p.freq || "maand";
  if (f === "maand") return true;
  var e = Math.max(1, Math.min(12, getal(p.eersteMaand) || 1)) - 1;
  var delta = ((d.getMonth() - e) % 12 + 12) % 12;
  return f === "kwartaal" ? delta % 3 === 0 : f === "halfjaar" ? delta % 6 === 0 : delta === 0;
}
var FREQ_PER_JAAR = { maand: 12, kwartaal: 4, halfjaar: 2, jaar: 1 };
// Lasten die in deze maand daadwerkelijk worden betaald (voor de spaarrekening).
function lastenInMaand(m, d) {
  var uit = [];
  var vast = 0;
  (m.lasten || []).forEach(function (p) {
    if (!periodeActief(p.start, p.einde, d) || !postBetaaldInMaand(p, d)) return;
    vast += getal(p.bedrag) * maandFactor(m, p.index, p.indexPct, d);
  });
  if (vast) uit.push({ label: "Vaste lasten", bedrag: vast, soort: "vast" });
  var dg = getal((m.dagelijks || {}).bedrag) * maandFactor(m, "cpi", 0, d);
  if (dg) uit.push({ label: "Dagelijkse uitgaven", bedrag: dg, soort: "dagelijks" });
  var hy = hypOp(m, d);
  if (hy.maandlast) uit.push({ label: "Hypotheek", bedrag: hy.maandlast, soort: "hypotheek" });
  return uit;
}
// Gemiddelde maandlast (jaarposten gespreid), voor het fasenoverzicht.
function lastenPerMaandGemiddeld(m, d) {
  var vast = 0;
  (m.lasten || []).forEach(function (p) {
    if (!periodeActief(p.start, p.einde, d)) return;
    vast += getal(p.bedrag) * (FREQ_PER_JAAR[p.freq || "maand"] / 12) * maandFactor(m, p.index, p.indexPct, d);
  });
  var dg = getal((m.dagelijks || {}).bedrag) * maandFactor(m, "cpi", 0, d);
  return { vast: vast, dagelijks: dg, hypotheek: hypOp(m, d).maandlast, totaal: vast + dg + hypOp(m, d).maandlast };
}
function reserveringMaandTotaal(m, d) {
  var t = 0;
  ((m.grote || {}).reserveringen || []).forEach(function (r) { if (periodeActief(r.start, r.einde, d)) t += getal(r.maand); });
  return t;
}

/* ---------- Deposito's ---------- */
// Betalingen van een deposito: rente en vrijval, met datum.
function depositoPlan(m, dep) {
  var start = geldigeDatum(dep.start);
  var eind = geldigeDatum(dep.eind) || (start && getal(dep.looptijd) > 0 ? plusMaanden(start, Math.round(getal(dep.looptijd))) : null);
  if (!start || !eind || eind <= start) return null;
  var bedrag = getal(dep.bedrag), r = getal(dep.rente) / 100;
  var dagen = dagenTussen(start, eind), jaren = dagen / 365;
  var hele = Math.floor(jaren + 1e-9), rest = Math.max(0, jaren - hele);
  var betalingen = [], totaleRente = 0;
  if (dep.uitkering === "jaarlijks") {
    for (var k = 1; k <= hele; k++) {
      var dd = plusJaren(start, k);
      if (dd >= eind) break;
      betalingen.push({ d: dd, bedrag: bedrag * r, soort: "rente" });
    }
    var laatste = bedrag * r * (eind > plusJaren(start, hele) ? (dagenTussen(plusJaren(start, hele), eind) / 365) : 0);
    if (hele >= 1 && eind.getTime() === plusJaren(start, hele).getTime()) laatste = bedrag * r;
    if (laatste > 0.005) betalingen.push({ d: eind, bedrag: laatste, soort: "rente" });
    betalingen.forEach(function (x) { totaleRente += x.bedrag; });
  } else {
    var ev = bedrag * Math.pow(1 + r, hele) * (1 + r * rest);
    totaleRente = Math.max(0, ev - bedrag - Math.max(0, getal(dep.reedsUitgekeerd)));
    betalingen.push({ d: eind, bedrag: totaleRente, soort: "rente" });
  }
  return { start: start, eind: eind, betalingen: betalingen, totaleRente: totaleRente };
}
function depositoActiefOp(m, dep, d) {
  var pl = depositoPlan(m, dep);
  if (!pl) return false;
  return pl.start <= d && d < pl.eind;
}
// Rente die tot en met datum d is uitgekeerd of opgebouwd (informatief).
function depositoRenteJaartabel(m, dep, jaar) {
  var pl = depositoPlan(m, dep);
  if (!pl) return 0;
  var t = 0;
  pl.betalingen.forEach(function (b) { if (b.d.getFullYear() === jaar) t += b.bedrag; });
  return t;
}

/* ---------- Spaargeld: dagelijkse berekening ---------- */
var SIM_MAANDEN = 60;
function maakSim(m, maanden, extraDatum) {
  maanden = maanden || SIM_MAANDEN;
  var start = m.peil, eind = plusMaanden(start, maanden);
  var events = [];
  function add(d, delta, label, soort, extra) {
    if (!d || d <= start || d > eind) return;
    if (!delta && !(extra && extra.reserveer)) return;
    events.push(Object.assign({ d: d, delta: delta, label: label, soort: soort }, extra || {}));
  }
  var dI = Math.max(1, Math.min(28, getal(m.inst.dagInkomen) || 25)), dL = Math.max(1, Math.min(28, getal(m.inst.dagLasten) || 1));
  var res = {}; (m.grote.reserveringen || []).forEach(function (r) { res[r.id] = getal(r.startsaldo); });
  var d0 = eerstVanMaand(start);
  for (var k = 0; k <= maanden + 1; k++) {
    var md = plusMaanden(d0, k);
    var hm = huishoudenMaand(m, md, true);
    hm.personen.forEach(function (p) { add(new Date(md.getFullYear(), md.getMonth(), dI), p.netto, "Netto inkomen " + p.naam, "inkomen"); });
    add(new Date(md.getFullYear(), md.getMonth(), dI), hm.aanvulling, "Opname uit " + (m.aanv.naam || "inkomensaanvulling"), "aanvulling");
    lastenInMaand(m, md).forEach(function (l) { add(new Date(md.getFullYear(), md.getMonth(), dL), -l.bedrag, l.label, l.soort); });
    (m.grote.reserveringen || []).forEach(function (r) {
      if (!periodeActief(r.start, r.einde, md) || !getal(r.maand)) return;
      var dag = Math.max(1, Math.min(28, getal(r.dag) || 22));
      add(new Date(md.getFullYear(), md.getMonth(), dag), -getal(r.maand), "Reservering " + (r.naam || "zonder naam"), "reservering", { resId: r.id, resDelta: getal(r.maand) });
    });
    (m.aanv.mutaties || []).forEach(function (x) {
      var xd = geldigeDatum(x.datum);
      if (xd && xd.getFullYear() === md.getFullYear() && xd.getMonth() === md.getMonth()) add(xd, -getal(x.bedrag), getal(x.bedrag) >= 0 ? "Bijstorten in " + (m.aanv.naam || "inkomensaanvulling") : "Afromen uit " + (m.aanv.naam || "inkomensaanvulling"), "aanvulmutatie");
    });
  }
  (m.grote.boekingen || []).forEach(function (b) {
    var d1 = geldigeDatum(b.datum); if (!d1) return;
    var bedrag = getal(b.bedrag), teken = b.type === "inkomst" ? 1 : -1;
    var naam = b.omschrijving || (teken > 0 ? "Inkomst zonder omschrijving" : "Uitgave zonder omschrijving");
    var tot = geldigeDatum(b.tot);
    var datums = [d1];
    if (b.herhaal === "jaarlijks") { for (var j = 1; j < 60; j++) { var dj = plusJaren(d1, j); if (dj > eind || (tot && dj > tot)) break; datums.push(dj); } }
    datums.forEach(function (dd) {
      if (b.reserveringId && teken < 0) add(dd, 0, naam + " (uit reservering)", "boeking", { resId: b.reserveringId, resDelta: -bedrag, reserveer: true });
      else add(dd, teken * bedrag, naam, "boeking");
    });
  });
  if (m.profiel.gebruik.deposito) (m.verm.deposito || []).forEach(function (dep) {
    var pl = depositoPlan(m, dep); if (!pl) return;
    var naam = dep.naam || "Deposito";
    if (pl.start > start) add(pl.start, -getal(dep.bedrag), "Deposito " + naam + " afgesloten (van spaarrekening)", "depoStart");
    pl.betalingen.forEach(function (b) { add(b.d, b.bedrag, "Rente deposito " + naam, "depoRente"); });
    if (pl.eind > start) add(pl.eind, getal(dep.bedrag), "Vrijval deposito " + naam, "depoVrijval");
  });
  events.sort(function (a, b) { return a.d - b.d; });

  var bal = getal(m.verm.spaar), rate = getal(m.inst.spaarrente) / 100;
  var ovr = m.grote.renteOverride || {};
  var rente = 0, ei = 0, renteJaar = {}, laagste = { d: start, bal: bal };
  var snapshots = [];
  var maandeinden = [];
  var sd = laatsteVanMaand(start); if (sd <= start) sd = laatsteVanMaand(plusMaanden(eerstVanMaand(start), 1));
  while (sd <= eind) { maandeinden.push(sd); sd = laatsteVanMaand(plusMaanden(eerstVanMaand(sd), 1)); }
  var mi = 0, minMaand = bal, maandStartBal = bal, extra = null;
  var resNu = Object.assign({}, res);
  var rec0 = { d: start, spaar: bal, min: bal, res: Object.assign({}, resNu), events: [] };
  snapshots.push(rec0);
  var huidigeEvents = [];
  for (var dg = plusDagen(start, 1); dg <= eind; dg = plusDagen(dg, 1)) {
    while (ei < events.length && events[ei].d <= dg) {
      var ev = events[ei++];
      bal += ev.delta;
      if (ev.resId) resNu[ev.resId] = (resNu[ev.resId] || 0) + ev.resDelta;
      huidigeEvents.push(ev);
    }
    if (bal > 0) rente += bal * rate / ((dg.getFullYear() % 4 === 0) ? 366 : 365);
    if (dg.getMonth() === 11 && dg.getDate() === 31) {
      var key = dg.getFullYear();
      var cr = ovr[key] !== undefined && ovr[key] !== "" && ovr[key] !== null ? getal(ovr[key]) : rente;
      if (cr) { bal += cr; huidigeEvents.push({ d: dg, delta: cr, label: "Rente spaarrekening " + key + (ovr[key] !== undefined && ovr[key] !== "" ? " (vast bedrag)" : ""), soort: "spaarrente" }); }
      renteJaar[key] = cr; rente = 0;
    }
    if (bal < minMaand) minMaand = bal;
    if (bal < laagste.bal) laagste = { d: dg, bal: bal };
    if (extraDatum && dg.getTime() === extraDatum.getTime()) extra = { d: dg, spaar: bal, res: Object.assign({}, resNu) };
    if (mi < maandeinden.length && dg.getTime() === maandeinden[mi].getTime()) {
      snapshots.push({ d: dg, spaar: bal, min: minMaand, res: Object.assign({}, resNu), events: huidigeEvents });
      huidigeEvents = []; minMaand = bal; mi++;
    }
  }
  return { start: start, eind: eind, maand: snapshots, events: events, renteJaar: renteJaar, laagste: laagste, extra: extra };
}

/* ---------- Vermogen op een datum ---------- */
function groeiFactor(m, pctJaar, d) {
  return Math.pow(1 + getal(pctJaar) / 100, Math.max(0, dagenTussen(m.peil, d)) / 365.25);
}
// Alle vermogensonderdelen op datum d. 'spaar' en 'res' komen uit de spaarberekening.
function vermogenItems(m, d, spaar, res) {
  var items = [];
  function item(key, comp, naam, waarde, extra) { items.push(Object.assign({ key: key, comp: comp, naam: naam, waarde: waarde }, extra || {})); }
  item("spaar", "sparen", "Spaarrekening(en)", spaar);
  if (m.profiel.gebruik.deposito) (m.verm.deposito || []).forEach(function (dep) {
    var pl = depositoPlan(m, dep);
    var actief = pl && pl.start <= d && d < pl.eind && pl.eind > m.peil;
    item("dep" + dep.id, "deposito", dep.naam || "Deposito", actief ? getal(dep.bedrag) : 0, { eind: pl && pl.eind });
  });
  if (m.profiel.gebruik.beleggen) (m.verm.beleggingen || []).forEach(function (b) {
    var rend = b.soort === "pensioen" ? m.inst.rendPot : m.inst.rendBeleggen;
    var sch = (b.soort === "vrij" && m.aanvB && m.aanvB.bron === "beleggen" && m.aanvB.besB > 0) ? 1 - m.aanvB.K / m.aanvB.besB : 1;
    item("bel" + b.id, b.soort === "pensioen" ? "pensioenbel" : "beleggen", b.naam || "Beleggingen", getal(b.waarde) * sch * groeiFactor(m, rend, d), { soort: b.soort });
  });
  if (m.profiel.gebruik.pensioen) m.potten.forEach(function (pt) { item("pot" + pt.id, "pensioen", pt.naam || "Pensioenpot", potSaldoOp(m, pt, d)); });
  if (m.profiel.gebruik.aanvulling && aanvulPlan(m).length) item("aanv", "aanvulling", "Inkomensaanvulling (gereserveerd)", d <= m.peil ? getal(m.aanv.startsaldo) : aanvulOp(m, d).saldo);
  (m.grote.reserveringen || []).forEach(function (r) { item("res" + r.id, "reserv", r.naam || "Reservering", (res && res[r.id] != null) ? res[r.id] : getal(r.startsaldo)); });
  (m.verm.overig || []).forEach(function (o) { item("ov" + o.id, "overig", o.naam || "Overige bezitting", getal(o.waarde), { box3: !!o.box3 }); });
  (m.verm.schulden || []).forEach(function (s) {
    if (s.soort === "uitstaand") item("sc" + s.id, "uitstaand", s.naam || "Uitstaande lening", getal(s.bedrag));
    else item("sc" + s.id, "schuld", s.naam || "Schuld", -getal(s.bedrag));
  });
  if (m.profiel.leef && m.profiel.leef.woning === "koop" && getal(m.profiel.leef.woz) > 0) item("woning", "overig", "Woning (WOZ-waarde)", getal(m.profiel.leef.woz), { box3: false });
  if (m.profiel.gebruik.hypotheek) ((m.hyp || {}).delen || []).forEach(function (dl, i) {
    if (getal(dl.bedrag) > 0) item("hyp" + dl.id, "hypotheek", "Hypotheekdeel " + (i + 1) + (dl.box === "3" ? " (box 3)" : " (box 1)"), -hypDeelOp(m, dl, d).saldo, { box: dl.box === "3" ? "3" : "1" });
  });
  return items;
}
function vermogenTotalen(items) {
  var t = { sparen: 0, deposito: 0, beleggen: 0, pensioenbel: 0, pensioen: 0, aanvulling: 0, reserv: 0, overig: 0, uitstaand: 0, schuld: 0, hypotheek: 0 };
  items.forEach(function (i) { t[i.comp] += i.waarde; });
  t.vrij = t.sparen + t.deposito + t.beleggen + t.reserv;
  t.gebonden = t.pensioenbel + t.pensioen + t.aanvulling;
  t.totaal = t.vrij + t.gebonden + t.overig + t.uitstaand + t.schuld + t.hypotheek;
  return t;
}
function vermogenReeks(m, sim) {
  return sim.maand.map(function (r) {
    var items = vermogenItems(m, r.d, r.spaar, r.res);
    return { d: r.d, items: items, t: vermogenTotalen(items), spaar: r.spaar, min: r.min, events: r.events };
  });
}

// Snel beschikbaar: spaargeld plus deposito's die binnen N maanden vrijvallen (inclusief rente).
function snelBeschikbaar(m, spaar, d) {
  var t = spaar, lijst = [];
  if (m.inst.kortMee && m.profiel.gebruik.deposito) (m.verm.deposito || []).forEach(function (dep) {
    var pl = depositoPlan(m, dep);
    if (!pl || pl.eind <= d || pl.start > d) return;
    var grens = plusMaanden(d, getal(m.inst.kortMaanden) || 3);
    if (pl.eind <= grens) {
      var rente = 0; pl.betalingen.forEach(function (b) { if (b.d > d) rente += b.bedrag; });
      var v = getal(dep.bedrag) + rente; t += v; lijst.push({ naam: dep.naam || "Deposito", eind: pl.eind, bedrag: v });
    }
  });
  return { totaal: t, lijst: lijst };
}

/* ---------- Fasen ---------- */
function loonActiefIn(m, pid, d) {
  var pers = persoonVan(m, pid);
  return m.bronnen.some(function (b) { return b.persoon === pid && b.soort === "loon" && bronActief(m, b, d, pers) && (getal(b.bruto) > 0 || getal(b.netto) > 0); });
}
function stopDatumLoon(m, pid) {
  var pers = persoonVan(m, pid), d0 = eerstVanMaand(m.peil), gezien = false;
  for (var k = 0; k <= 480; k++) {
    var d = plusMaanden(d0, k);
    var a = loonActiefIn(m, pid, d);
    if (a) gezien = true; else if (gezien) return d;
    if (pers.aow && d > pers.aow && !a) return gezien ? d : null;
  }
  return null;
}
function fasenLijst(m) {
  var d0 = eerstVanMaand(m.peil), lijst = [{ d: d0, namen: ["Nu"] }];
  function voeg(d, naam) {
    if (!d || d <= d0) return;
    var dm = eerstVanMaand(d), g = lijst.filter(function (x) { return x.d.getTime() === dm.getTime(); })[0];
    if (g) g.namen.push(naam); else lijst.push({ d: dm, namen: [naam] });
  }
  var laatsteAow = null;
  m.personen.forEach(function (p) {
    var sd = stopDatumLoon(m, p.id);
    if (sd && !(p.aow && eerstVanMaand(p.aow).getTime() === sd.getTime())) voeg(sd, p.naam + " stopt met werken");
    if (p.aow) { voeg(p.aow, "AOW " + p.naam); if (!laatsteAow || p.aow > laatsteAow) laatsteAow = p.aow; }
  });
  if (laatsteAow) voeg(plusJaren(laatsteAow, 5), "Vijf jaar na AOW");
  lijst.sort(function (a, b) { return a.d - b.d; });
  return lijst.map(function (f) {
    var hm = huishoudenMaand(m, f.d), l = lastenPerMaandGemiddeld(m, f.d);
    return { d: f.d, naam: f.namen.join(" en "), netto: hm.netto, personen: hm.personen, aanvulling: hm.aanvulling, lasten: l, reservering: reserveringMaandTotaal(m, f.d), saldo: hm.netto - l.totaal - reserveringMaandTotaal(m, f.d) };
  });
}

/* ---------- Controles en aandachtspunten ---------- */
function heeftGegevens(m, menu) {
  switch (menu) {
    case "dashboard": return !!(m.profiel.geboorteA && m.profiel.type);
    case "inkomen": return m.bronnen.length > 0;
    case "aanvulling": return aanvulPlan(m).length > 0;
    case "pensioen": return m.potten.length > 0 || ((m.hyp || {}).delen || []).length > 0;
    case "lasten": return (m.lasten || []).length > 0 || getal((m.dagelijks || {}).bedrag) > 0;
    case "vermogen": return getal(m.verm.spaar) > 0 || (m.verm.rekeningen || []).length > 0 || (m.verm.deposito || []).length > 0 || (m.verm.beleggingen || []).length > 0 || (m.verm.overig || []).length > 0;
    case "grote": return (m.grote.reserveringen || []).length > 0 || (m.grote.boekingen || []).length > 0;
    default: return false;
  }
}
