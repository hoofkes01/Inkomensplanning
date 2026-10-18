/* ===== Basis: hulpfuncties, opslag, invoervelden ===== */
var h = React.createElement;
var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, useContext = React.useContext;

var OPSLAG_VOORVOEGSEL = "inkomensplanning_";
var OPSLAG_MELDINGEN = {};
var opslagLuisteraars = [];
function meldOpslagprobleem(soort, tekst) {
  OPSLAG_MELDINGEN[soort] = tekst;
  opslagLuisteraars.forEach(function (f) { try { f(); } catch (e) {} });
}

/* ---------- Getallen en tekst ---------- */
function getal(x) { var n = Number(x); return isFinite(n) ? n : 0; }
function groepeer(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function eur(n) {
  if (n == null || n === "" || !isFinite(Number(n))) return "–";
  var r = Math.round(Number(n));
  return (r < 0 ? "-" : "") + "€ " + groepeer(Math.abs(r));
}
function getalTekst(n) {
  if (n == null || n === "" || !isFinite(Number(n))) return "";
  var r = Math.round(Number(n));
  return (r < 0 ? "-" : "") + groepeer(Math.abs(r));
}
function pct(n, dec) {
  if (n == null || n === "" || !isFinite(Number(n))) return "–";
  var d = dec == null ? 1 : dec;
  return Number(n).toFixed(d).replace(".", ",") + "%";
}
function duizend(n) { return (Math.round(getal(n) / 100) / 10).toFixed(0).replace("-0", "0"); }
function nieuwId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function afr10(x) { return Math.round(x / 10) * 10; }

/* ---------- Datums: een yyyy-mm-dd-tekst is altijd een lokale kalenderdag ---------- */
function geldigeDatum(w) {
  if (!w) return null;
  if (w instanceof Date) return isNaN(w.getTime()) ? null : new Date(w.getFullYear(), w.getMonth(), w.getDate());
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1) return null;
  return d;
}
function isoDatum(d) {
  if (!d) return "";
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function vandaag() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function eerstVanMaand(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function laatsteVanMaand(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function plusMaanden(d, n) {
  var r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  r.setDate(Math.min(d.getDate(), laatsteVanMaand(r).getDate()));
  return r;
}
function plusJaren(d, n) { return plusMaanden(d, 12 * n); }
function plusDagen(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function maandenTussen(a, b) { return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); }
function dagenTussen(a, b) { return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
function fmtDatum(d) {
  var x = geldigeDatum(d);
  if (!x) return "–";
  return String(x.getDate()).padStart(2, "0") + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + x.getFullYear();
}
var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
var MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function fmtMaand(d) { return MAANDEN[d.getMonth()] + " " + d.getFullYear(); }
function fmtMaandKort(d) { return MAANDEN_KORT[d.getMonth()] + " " + String(d.getFullYear()).slice(2); }
function dagKey(d) { return isoDatum(d); }
function leeftijdJaren(geb, op) {
  var g = geldigeDatum(geb); if (!g) return null;
  var j = op.getFullYear() - g.getFullYear();
  if (op.getMonth() < g.getMonth() || (op.getMonth() === g.getMonth() && op.getDate() < g.getDate())) j--;
  return j;
}
function parseStempel(s) {
  var m = /^(\d{2})-(\d{2})-(\d{4})\s*·\s*(\d{2}):(\d{2})$/.exec(String(s || ""));
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5])) : null;
}
function ouderDan(datumTekst, dagen, nu) {
  var d = geldigeDatum(datumTekst);
  if (!d) return true;
  return dagenTussen(d, nu) > dagen;
}

/* ---------- Opslag in de browser ---------- */
function useOpslag(sleutel, beginwaarde) {
  var volleSleutel = OPSLAG_VOORVOEGSEL + sleutel;
  var s = useState(function () {
    try {
      var o = window.localStorage.getItem(volleSleutel);
      if (o !== null) {
        var p = JSON.parse(o);
        if (beginwaarde && typeof beginwaarde === "object" && !Array.isArray(beginwaarde) && p && typeof p === "object" && !Array.isArray(p)) {
          var r = {};
          Object.keys(beginwaarde).forEach(function (k) {
            var b = beginwaarde[k];
            r[k] = (b && typeof b === "object" && !Array.isArray(b) && p[k] && typeof p[k] === "object" && !Array.isArray(p[k])) ? Object.assign({}, b, p[k]) : b;
          });
          Object.keys(p).forEach(function (k) { r[k] = (r[k] && typeof r[k] === "object" && !Array.isArray(r[k]) && p[k] && typeof p[k] === "object" && !Array.isArray(p[k])) ? r[k] : p[k]; });
          return r;
        }
        return p;
      }
      return beginwaarde;
    } catch (e) {
      try {
        var kapot = window.localStorage.getItem(volleSleutel);
        if (kapot !== null) {
          window.localStorage.setItem(OPSLAG_VOORVOEGSEL + "_kapot_" + sleutel, kapot);
          meldOpslagprobleem("lezen", "Opgeslagen gegevens van '" + sleutel + "' waren onleesbaar en staan nu op de beginwaarde. Het origineel is apart bewaard. Zet anders je laatste back-up terug.");
        }
      } catch (e2) {
        meldOpslagprobleem("beschikbaar", "De opslag van deze browser is niet beschikbaar. Wijzigingen blijven niet bewaard. Gebruik geen privévenster.");
      }
      return beginwaarde;
    }
  });
  useEffect(function () {
    try { window.localStorage.setItem(volleSleutel, JSON.stringify(s[0])); }
    catch (e) { meldOpslagprobleem("schrijven", "Opslaan is mislukt (" + ((e && e.name) || "onbekende fout") + "). Maak nu een back-up en controleer de opslagruimte van je browser."); }
  }, [volleSleutel, s[0]]);
  return s;
}

function maakBackup() {
  var gegevens = {};
  try {
    for (var i = 0; i < window.localStorage.length; i++) {
      var k = window.localStorage.key(i);
      if (k && k.indexOf(OPSLAG_VOORVOEGSEL) === 0 && k.indexOf(OPSLAG_VOORVOEGSEL + "_kapot_") !== 0) gegevens[k] = window.localStorage.getItem(k);
    }
  } catch (e) {}
  return { app: "inkomensplanning-blanco", appVersie: APP_VERSIE, gemaakt: new Date().toISOString(), gegevens: gegevens };
}
function downloadBackup() {
  var b = maakBackup();
  var blob = new Blob([JSON.stringify(b)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inkomensplanning-back-up-" + isoDatum(vandaag()) + ".json";
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function zetBackupTerug(bestand, klaar) {
  var lezer = new FileReader();
  lezer.onload = function () {
    var b;
    try { b = JSON.parse(String(lezer.result)); } catch (e) { klaar("Dit bestand is geen geldige back-up."); return; }
    if (!b || b.app !== "inkomensplanning-blanco" || !b.gegevens) { klaar("Dit bestand is geen back-up van deze app."); return; }
    var bd = parseStempel(b.appVersie), nu = parseStempel(APP_VERSIE);
    if (bd && nu && bd < nu && !window.confirm("Let op: deze back-up komt uit een oudere versie van de app (" + b.appVersie + "). Nieuwe onderdelen kunnen leeg zijn. Doorgaan met terugzetten?")) { klaar("Terugzetten afgebroken."); return; }
    if (bd && nu && bd > nu && !window.confirm("Let op: deze back-up komt uit een nieuwere versie (" + b.appVersie + ") dan deze app (" + APP_VERSIE + "). Vervang eerst het appbestand door de nieuwste versie. Toch doorgaan?")) { klaar("Terugzetten afgebroken."); return; }
    try {
      Object.keys(b.gegevens).forEach(function (k) { if (k.indexOf(OPSLAG_VOORVOEGSEL) === 0) window.localStorage.setItem(k, b.gegevens[k]); });
    } catch (e) { klaar("Terugzetten is mislukt: " + (e && e.name)); return; }
    klaar("Terugzetten gelukt. De app laadt opnieuw."); setTimeout(function () { window.location.reload(); }, 600);
  };
  lezer.onerror = function () { klaar("Het bestand kon niet worden gelezen."); };
  lezer.readAsText(bestand);
}

/* ---------- Invoervelden ---------- */
// Bedrag of percentage. Bedragen: punt = duizendtal, komma = decimaal. Percentages: punt of komma = decimaal.
function leesGetal(tekst, isPct) {
  var t = String(tekst).replace(/[€%\s]/g, "");
  if (t === "" || t === "-") return "";
  if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
  else if (isPct) { /* punt blijft decimaal */ }
  else t = t.replace(/\./g, "");
  var n = Number(t);
  return isFinite(n) ? n : "";
}
function NumInput(p) {
  var s = useState(null), tekst = s[0], setTekst = s[1];
  var v = p.value;
  var weergave = tekst !== null ? tekst : (v === "" || v == null || !isFinite(Number(v)) ? "" : (p.pct ? String(Math.round(Number(v) * 100) / 100).replace(".", ",") : (function () { var n = Math.round(Number(v) * 100) / 100; var delen = String(Math.abs(n)).split("."); return (n < 0 ? "-" : "") + groepeer(delen[0]) + (delen[1] ? "," + delen[1] : ""); })()));
  return h("input", {
    type: "text", inputMode: p.neg ? "text" : "decimal", value: weergave, placeholder: p.placeholder || "", disabled: p.disabled, id: p.id, "data-veld": p.naam,
    onFocus: function () { setTekst(v === "" || v == null ? "" : String(v).replace(".", ",")); },
    onChange: function (e) {
      var t = e.target.value;
      if (!p.neg) t = t.replace(/-/g, "");
      setTekst(t);
      var n = leesGetal(t, p.pct);
      p.onChange(n === "" ? "" : (p.max != null && n > p.max ? p.max : n));
    },
    onBlur: function () { setTekst(null); }
  });
}
function Veld(p) {
  return h("label", { className: "veld" + (p.fout ? " fout" : ""), style: p.stijl },
    h("span", null, p.label), p.children,
    p.hint ? h("small", null, p.hint) : null,
    p.fout ? h("small", { className: "rood" }, p.fout) : null);
}
function BedragVeld(p) {
  return h(Veld, { label: p.label, hint: p.hint, fout: p.fout }, h(NumInput, { value: p.value, onChange: p.onChange, pct: p.pct, neg: p.neg, max: p.max, placeholder: p.placeholder, naam: p.naam }));
}
/* ---------- Anoniem blijven: geen persoonsgegevens in tekstvelden ---------- */
function anoniemFout(t) {
  var x = String(t || "");
  if (!x) return "";
  var kaal = x.replace(/[\s.\-]/g, "");
  if (/\S+@\S+\.\S+/.test(x)) return "een e-mailadres";
  if (/\b[A-Za-z]{2}\d{2}\s?[A-Za-z0-9]{4}[\s\d]{6,}/.test(x)) return "een rekeningnummer (IBAN)";
  if (/\b\d{4}\s?[A-Za-z]{2}\b/.test(x)) return "een postcode";
  if (/\d{9,}/.test(kaal)) return "een nummer met 9 of meer cijfers (BSN, telefoon of rekening)";
  if (/(\+31|\b06[\s-]?\d|\b0\d{2}[\s-]?\d{6,7})/.test(x) && /\d{6,}/.test(kaal)) return "een telefoonnummer";
  if (/\b[A-Za-zÀ-ÿ]+(straat|laan|weg|plein|gracht|singel|kade|hof|dijk|steeg|park|baan)\s+\d+/i.test(x)) return "een adres";
  return "";
}
function TekstVeld(p) {
  var s = useState(""), melding = s[0], setMelding = s[1];
  return h(Veld, { label: p.label, hint: p.hint, fout: p.fout || melding },
    h("input", { type: "text", value: p.value || "", placeholder: p.placeholder || "", autoComplete: "off", list: p.lijst || undefined, maxLength: 80,
      onChange: function (e) {
        var f = anoniemFout(e.target.value);
        if (f) { setMelding("Dit is niet toegestaan: de app bewaart geen persoonsgegevens (je typt " + f + "). Laat dit weg."); return; }
        setMelding(""); p.onChange(e.target.value);
      }, "data-veld": p.naam }));
}
var BANKEN = ["ING", "Rabobank", "ABN AMRO", "SNS Bank", "ASN Bank", "RegioBank", "Triodos Bank", "Knab", "bunq", "Bank Nagelmackers", "Raisin", "DEGIRO", "BinckBank", "Saxo", "Brand New Day", "Nationale-Nederlanden", "Aegon", "a.s.r.", "Achmea", "Volksbank", "Moneyou", "Lloyds Bank", "Santander", "Deutsche Bank", "Commerzbank", "Wise", "Revolut"];
function BankenLijst() { return h("datalist", { id: "bankenlijst" }, BANKEN.map(function (b) { return h("option", { key: b, value: b }); })); }
// Vaste omschrijvingen met een uitweg 'Overig' (eigen omschrijving, zonder persoonsgegevens).
function OmschrijvingKeuze(p) {
  var opt = p.opties, gekozen = opt.indexOf(p.value) >= 0 ? p.value : (p.value ? "__overig" : "");
  return h("div", null,
    h(Veld, { label: p.label, hint: p.hint, fout: p.fout },
      h("select", { value: gekozen, "data-veld": p.naam, onChange: function (e) { var v = e.target.value; p.onChange(v === "__overig" ? "Overig" : v); } },
        [h("option", { key: "", value: "" }, "Kies een omschrijving")].concat(opt.map(function (o) { return h("option", { key: o, value: o }, o); })).concat([h("option", { key: "__overig", value: "__overig" }, "Overig (eigen omschrijving)")]))),
    gekozen === "__overig" ? h(TekstVeld, { label: "Eigen omschrijving (zonder namen of nummers)", value: p.value === "Overig" ? "" : p.value, onChange: function (v) { p.onChange(v || "Overig"); }, naam: (p.naam || "omschr") + "-eigen" }) : null);
}
// Datum als gewoon tekstveld (dd-mm-jjjj): werkt op elk apparaat, ook waar de ingebouwde datumkiezer ontbreekt.
function isoNaarTekst(iso) {
  var d = geldigeDatum(iso);
  return d ? String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear() : "";
}
function maskCijfers(c, groepen) {
  var uit = [], i = 0;
  groepen.forEach(function (g) { var deel = c.slice(i, i + g); i += g; if (deel) uit.push(deel); });
  return uit.join("-");
}
function DatumVeld(p) {
  var s = useState(null), tekst = s[0], setTekst = s[1];
  var weergave = tekst !== null ? tekst : isoNaarTekst(p.value);
  var cijfers = (tekst || "").replace(/\D/g, "");
  var fout = "";
  if (tekst !== null && cijfers.length > 0) fout = cijfers.length < 8 ? "Vul de datum in als dag-maand-jaar, bijvoorbeeld 15-09-1966." : "Deze datum bestaat niet.";
  return h(Veld, { label: p.label, hint: p.hint, fout: p.fout || fout },
    h("input", { type: "text", inputMode: "numeric", placeholder: "dd-mm-jjjj", autoComplete: "off", maxLength: 10, value: weergave, "data-veld": p.naam,
      onChange: function (e) {
        var c = e.target.value.replace(/\D/g, "").slice(0, 8);
        if (c.length === 0) { setTekst(null); p.onChange(""); return; }
        if (c.length === 8) {
          var iso = c.slice(4) + "-" + c.slice(2, 4) + "-" + c.slice(0, 2);
          if (geldigeDatum(iso)) { setTekst(null); p.onChange(iso); return; }
        }
        setTekst(maskCijfers(c, [2, 2, 4]));
      } }));
}
function KeuzeVeld(p) {
  return h(Veld, { label: p.label, hint: p.hint, fout: p.fout },
    h("select", { value: p.value == null ? "" : p.value, onChange: function (e) { p.onChange(e.target.value); }, "data-veld": p.naam },
      p.opties.map(function (o) { return h("option", { key: o[0], value: o[0] }, o[1]); })));
}
function Vink(p) {
  return h("label", { className: "vink" },
    h("input", { type: "checkbox", checked: !!p.value, "data-vink": p.naam, onChange: function (e) { p.onChange(e.target.checked); } }),
    h("span", null, p.label, p.hint ? h("small", { className: "klein", style: { display: "block" } }, p.hint) : null));
}
function Knop(p) {
  return h("button", { type: "button", className: "knop" + (p.soort ? " " + p.soort : "") + (p.klein ? " klein2" : ""), onClick: p.onClick, disabled: p.disabled, "data-knop": p.naam, title: p.titel }, p.children);
}
function Kaart(p) {
  return h("section", { className: "kaart" + (p.soort ? " " + p.soort : ""), id: p.id }, p.titel ? h("h2", null, p.titel) : null, p.children);
}
function Waarschuwing(p) {
  return h("div", { className: "kaart " + (p.soort || "waarschuw"), role: "note" }, p.children);
}
function Modal(p) {
  useEffect(function () {
    function toets(e) { if (e.key === "Escape") p.sluit(); }
    document.addEventListener("keydown", toets);
    return function () { document.removeEventListener("keydown", toets); };
  }, []);
  return ReactDOM.createPortal(
    h("div", { className: "modaal noprint", onClick: function (e) { if (e.target === e.currentTarget) p.sluit(); } },
      h("div", { role: "dialog", "aria-modal": "true" },
        h("div", { className: "rij tussen" }, h("h2", null, p.titel), h(Knop, { soort: "sec", klein: true, onClick: p.sluit }, "Sluiten")),
        p.children)),
    document.body);
}
function Tabel(p) {
  // p.kolommen: [{k, t, get}]  p.rijen: array van objecten of arrays van cellen
  return h("div", { className: "tabelwrap" },
    h("table", { className: p.className || "" },
      h("thead", null, h("tr", null, p.kop.map(function (k, i) { return h("th", { key: i, className: (p.get || []).indexOf(i) >= 0 ? "get" : "" }, k); }))),
      h("tbody", null, p.rijen.map(function (r, i) {
        var cellen = r.cellen || r;
        return h("tr", { key: i, className: (r.klasse || "") + (r.klik ? " klik" : ""), onClick: r.klik || null },
          cellen.map(function (c, j) { return h("td", { key: j, className: (p.get || []).indexOf(j) >= 0 ? "get" : "" }, c); }));
      }))));
}

/* ---------- Grafiek: gestapelde staven (in duizenden euro's) ---------- */
function Staafgrafiek(p) {
  // p.reeksen: [{naam, kleur}], p.punten: [{label, waarden:[...]}] ; p.onKlik(i)
  var B = 360, Hh = 170, ml = 30, mb = 20, mt = 6;
  var tot = p.punten.map(function (x) { return x.waarden.reduce(function (s, v) { return s + Math.max(0, v); }, 0); });
  var max = Math.max.apply(null, tot.concat([1]));
  var stap = Math.pow(10, Math.floor(Math.log10(max))); var top = Math.ceil(max / stap) * stap; if (top / stap < 3) { stap = stap / 2; top = Math.ceil(max / stap) * stap; }
  var n = p.punten.length, bw = (B - ml) / n, delen = [];
  for (var y = 0; y <= top + 1; y += stap) delen.push(y);
  var sy = function (v) { return mt + (Hh - mt - mb) * (1 - v / top); };
  return h("svg", { viewBox: "0 0 " + B + " " + Hh, width: "100%", style: { display: "block", maxWidth: "100%" }, role: "img", "aria-label": p.titel || "Grafiek" },
    delen.map(function (y2, i) { return h("g", { key: "g" + i }, h("line", { x1: ml, x2: B, y1: sy(y2), y2: sy(y2), stroke: "#e2e8f0", strokeWidth: 1 }), h("text", { x: ml - 3, y: sy(y2) + 3, fontSize: 8, textAnchor: "end", fill: "#64748b" }, duizend(y2))); }),
    p.punten.map(function (pt, i) {
      var acc = 0, x = ml + i * bw + bw * 0.12, w = bw * 0.76;
      return h("g", { key: i, onClick: p.onKlik ? function () { p.onKlik(i); } : null, style: { cursor: p.onKlik ? "pointer" : "default" } },
        h("rect", { x: ml + i * bw, y: mt, width: bw, height: Hh - mt - mb, fill: "transparent" }),
        pt.waarden.map(function (v, j) {
          if (v <= 0) return null;
          var y0 = sy(acc + v), hh = sy(acc) - y0; acc += v;
          return h("rect", { key: j, x: x, y: y0, width: w, height: Math.max(0, hh), fill: p.reeksen[j].kleur });
        }),
        (i % (n > 12 ? 3 : 1) === 0) ? h("text", { x: x + w / 2, y: Hh - 6, fontSize: 7.5, textAnchor: "middle", fill: "#64748b" }, pt.label) : null);
    }));
}
function Legenda(p) {
  return h("div", { className: "rij klein", style: { gap: ".2rem .8rem" } }, p.reeksen.map(function (r) { return h("span", { key: r.naam }, h("i", { className: "kleurpunt", style: { background: r.kleur } }), r.naam); }));
}
