/* ===== Agenda: actiemomenten als .ics-bestand voor de agenda van de klant (Google, Apple, Outlook) ===== */
var CONTRACT_CODES = ["energie", "internet", "mobiel", "opstal", "inboedel", "aansprakelijk", "rechtsbijstand", "auto_verz", "levensverz", "arbeidsong", "zorg_aanv", "auto_lease", "abonnementen", "sport", "ov"];
var OFFERTE_CODES = CONTRACT_CODES.concat(["zorgverz", "sport", "ov", "bankkosten"]);
var CONTRACT_VOORAF = { energie: 3, auto_lease: 6 }; // maanden vooraf; overige contracten: 2
var JAAR_CHECK = { energie: [9, 1, "Beoordeel je energiecontract", "Vast of variabel, past het voorschot bij je verbruik, is er een beter aanbod?"], internet: [2, 1, "Beoordeel internet en tv", "Vergelijk aanbieders en zeg pakketten op die je niet gebruikt."], mobiel: [3, 1, "Beoordeel je mobiele abonnement", "Past de databundel bij je gebruik? Overweeg sim-only."], abonnementen: [5, 1, "Loop je abonnementen langs", "Zeg op wat je niet of nauwelijks gebruikt."], bankkosten: [8, 1, "Beoordeel de kosten van je bankrekening", "Vergelijk betaalrekeningen en kosten."] };
var VERZ_CODES = ["opstal", "inboedel", "aansprakelijk", "rechtsbijstand", "auto_verz", "levensverz", "arbeidsong"];

function agendaMomenten(c) {
  var m = c.m, S = c.S, L = lijstL(S.profiel), uit = [], nu = new Date(m.nu.getFullYear(), m.nu.getMonth(), m.nu.getDate());
  function volgende(mnd, dag) { var d = new Date(nu.getFullYear(), mnd, dag); if (d < nu) d = new Date(nu.getFullYear() + 1, mnd, dag); return d; }
  function jaarlijks(mnd, dag, titel, uitleg) { uit.push({ d: volgende(mnd, dag), titel: titel, uitleg: uitleg, jaarlijks: true }); }
  function eenmalig(d, titel, uitleg) { if (d && d >= nu) uit.push({ d: d, titel: titel, uitleg: uitleg, jaarlijks: false }); }
  function maandenVoor(d, n) { return new Date(d.getFullYear(), d.getMonth() - n, Math.min(d.getDate(), 28)); }
  var codes = (m.lasten || []).map(function (p) { return p.code; });
  var heeft = function (c2) { return codes.indexOf(c2) >= 0; };

  jaarlijks(10, 1, "Beoordeel je zorgverzekering", "De premies voor volgend jaar zijn bekend. Vergelijk basis en aanvullende verzekering. Overstappen kan tot en met 31 januari.");
  jaarlijks(0, 20, "Laatste kans zorgverzekering", "Je kunt tot en met 31 januari nog overstappen met terugwerkende kracht per 1 januari.");
  jaarlijks(2, 1, "Doe je aangifte inkomstenbelasting", "De aangifte kan vanaf 1 maart; de uiterste datum is 1 mei. Controleer ook je voorlopige aanslag en toeslagen.");
  jaarlijks(3, 20, "Aangifte: uiterlijk 1 mei", "Is je aangifte nog niet klaar? Doe die nu of vraag uitstel aan.");
  jaarlijks(8, 25, "Nieuwe belasting- en toeslagcijfers", "Na Prinsjesdag zijn de cijfers voor volgend jaar bekend. Werk je planning bij.");
  jaarlijks(11, 15, "Peildatum 1 januari", "Je vermogen op 1 januari telt voor box 3 en toeslagen. Giften en uitgaven die je wilt aftrekken moeten voor 31 december zijn gedaan.");
  if (L.woning === "koop") jaarlijks(2, 1, "Controleer je WOZ-waarde", "Bezwaar tegen de WOZ-beschikking kan meestal binnen 6 weken na de datum van de beschikking.");
  if ((m.profiel.gebruik || {}).beleggen) jaarlijks(0, 5, "Controleer je beleggingen en spreiding", "Kijk of je verdeling nog past bij je risicoprofiel en doe zo nodig een herbalancering.");
  Object.keys(JAAR_CHECK).forEach(function (k) {
    if (!heeft(k)) return;
    var post = (m.lasten || []).filter(function (p) { return p.code === k; })[0];
    if (post && geldigeDatum(post.contractEinde)) return; // heeft een eigen einddatum
    var j = JAAR_CHECK[k]; jaarlijks(j[0], j[1], j[2], j[3]);
  });
  if (VERZ_CODES.some(heeft)) jaarlijks(4, 1, "Loop je verzekeringen langs", "Vergelijk premies en dekking, schrap dubbele of overbodige dekking en controleer of alles nog past bij je situatie.");

  (m.lasten || []).forEach(function (p) {
    var d = geldigeDatum(p.contractEinde);
    if (!d || CONTRACT_CODES.indexOf(p.code) < 0 || p.opzeg === "direct") return;
    var naam = (lastCat(p.code) || {}).label || "Contract", v = CONTRACT_VOORAF[p.code] || 2;
    eenmalig(maandenVoor(d, v), "Beoordeel: " + naam, "Dit contract loopt af op " + fmtDatum(d) + ". Vergelijk nu aanbieders en zeg tijdig op of verleng bewust.");
    eenmalig(maandenVoor(d, 1), "Laatste kans: " + naam, "Dit contract loopt af op " + fmtDatum(d) + ". Regel de opzegging of verlenging voor het te laat is.");
  });
  hypRisico(m).forEach(function (r) {
    if (!r.datum) return;
    eenmalig(maandenVoor(r.datum, 6), r.naam + ": vergelijk je renteopties", "De rente wordt herzien op " + fmtDatum(r.datum) + ". Vraag het rentevoorstel op en vergelijk aanbieders.");
    eenmalig(maandenVoor(r.datum, 2), r.naam + ": beslis over de nieuwe rente", "De rente wordt herzien op " + fmtDatum(r.datum) + ".");
  });
  (S.verm.deposito || []).forEach(function (dep) {
    var pl = depositoPlan(m, dep); if (!pl) return;
    eenmalig(maandenVoor(pl.eind, 1), "Deposito loopt af", "Een deposito loopt af op " + fmtDatum(pl.eind) + ". Besluit waar het geld naartoe gaat (nieuw deposito of spaarrekening).");
  });
  m.personen.forEach(function (p) { if (p.aow) eenmalig(maandenVoor(p.aow, 6), "AOW: controleer je aanvraag", "De AOW-datum is " + fmtDatum(p.aow) + ". Controleer bij de SVB of alles is geregeld."); });
  (S.grote.boekingen || []).forEach(function (b) {
    var d = geldigeDatum(b.datum); if (!d || b.type !== "uitgave" || getal(b.bedrag) < 500) return;
    eenmalig(maandenVoor(d, 1), "Grote uitgave komt eraan", "Controleer of je reservering genoeg is voor de uitgave van " + fmtDatum(d) + ".");
  });
  return uit.sort(function (a, b) { return a.d - b.d; });
}

function icsTekst(t) { return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function icsVouw(regel) { var uit = [], r = regel; while (r.length > 73) { uit.push(r.slice(0, 73)); r = " " + r.slice(73); } uit.push(r); return uit.join("\r\n"); }
function icsDatum(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); }
function maakIcs(momenten, nu) {
  var stempel = nu.getFullYear() + String(nu.getMonth() + 1).padStart(2, "0") + String(nu.getDate()).padStart(2, "0") + "T000000Z";
  var r = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Inkomensplanning//NL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Inkomensplanning"];
  momenten.forEach(function (x, i) {
    r.push("BEGIN:VEVENT", "UID:ip-" + icsDatum(x.d) + "-" + i + "@inkomensplanning", "DTSTAMP:" + stempel, "DTSTART;VALUE=DATE:" + icsDatum(x.d), "SUMMARY:" + icsTekst(x.titel), "DESCRIPTION:" + icsTekst(x.uitleg));
    if (x.jaarlijks) r.push("RRULE:FREQ=YEARLY");
    r.push("TRANSP:TRANSPARENT", "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsTekst(x.titel), "TRIGGER;RELATED=START:PT9H", "END:VALARM", "END:VEVENT");
  });
  r.push("END:VCALENDAR");
  return r.map(icsVouw).join("\r\n") + "\r\n";
}
function downloadIcs(momenten, nu) {
  var blob = new Blob([maakIcs(momenten, nu)], { type: "text/calendar;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "inkomensplanning-agenda.ics";
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function AgendaKnop(p) {
  var c = useC(), mom = agendaMomenten(c), s = useState(""), melding = s[0], setMelding = s[1];
  return h("div", { className: "noprint", "data-blok": "agenda" },
    h("div", { className: "rij" }, h(Knop, { onClick: function () { try { downloadIcs(mom, c.m.nu); setMelding("Bestand gemaakt. Open het op je telefoon of computer en kies je agenda."); } catch (e) { setMelding("Het bestand kon niet worden gemaakt."); } }, naam: "agenda-download" }, "Zet actiemomenten in je agenda (" + mom.length + ")")),
    melding ? h("p", { className: "klein", role: "status" }, melding) : null,
    h("p", { className: "klein" }, "Je krijgt een .ics-bestand met herinneringen om 9.00 uur, ook voor terugkerende momenten zoals de zorgverzekering. Open het bestand in Google Agenda, Apple Agenda of Outlook. Er staan geen bedragen of namen in. Vul bij vaste lasten de einddatum van het contract in voor een herinnering vlak voordat het afloopt."));
}
function AgendaKaart() {
  var c = useC();
  if (!(c.S.intake.dashboard || {}).klaar) return null;
  return h(Kaart, { titel: "Actiemomenten in je agenda" }, h(AgendaKnop, null));
}

/* ---------- Nieuwe aanbiedingen: besparing en vergoeding ---------- */
function aanbodBesparing(p) {
  var a = p.aanbod;
  if (!a || a.bedrag === "" || a.bedrag == null || !(getal(p.bedrag) > 0)) return null;
  var f = FREQ_PER_JAAR[p.freq || "maand"] || 12;
  var oud = getal(p.bedrag) * f, nieuw = getal(a.bedrag) * f, korting = getal(a.korting);
  return { oud: oud, nieuw: nieuw, korting: korting, jaar1: oud - nieuw + korting, vanaf2: oud - nieuw, afgesloten: a.status === "afgesloten" };
}
function aanbiedingen(m, pct) {
  var rijen = [];
  (m.lasten || []).forEach(function (p) {
    var b = aanbodBesparing(p);
    if (!b || b.jaar1 <= 0) return;
    var cat = lastCat(p.code), naam = (cat && cat.label) || p.naam || "Vaste last";
    rijen.push(Object.assign({ naam: naam, aanbieder: (p.aanbod || {}).aanbieder || "", vergoeding: Math.max(0, b.jaar1) * pct / 100, opzeg: p.opzeg, einde: geldigeDatum(p.contractEinde) }, b));
  });
  var som = function (k, alleenAfgesloten) { return rijen.filter(function (r) { return !alleenAfgesloten || r.afgesloten; }).reduce(function (a, r) { return a + r[k]; }, 0); };
  return { rijen: rijen, pct: pct, jaar1: som("jaar1"), vanaf2: som("vanaf2"), vergoeding: som("vergoeding"), vergoedingAfgesloten: som("vergoeding", true), jaar1Afgesloten: som("jaar1", true) };
}
function AanbiedingenRapport(p) {
  var m = p.m, pct = getal((m.rapport || {}).vergoedingPct), A = aanbiedingen(m, pct === 0 && (m.rapport || {}).vergoedingPct === "" ? 50 : pct);
  if (!A.rijen.length) return h("p", null, "Er zijn nog geen nieuwe aanbiedingen vergeleken.");
  return h("div", { "data-blok": "aanbiedingen" },
    h(Tabel, { className: "rp-tabel", kop: ["Vaste last", "Nu per jaar", "Nieuw per jaar", "Besparing jaar 1", "Vanaf jaar 2", "Stand"], get: [1, 2, 3, 4], rijen: A.rijen.map(function (r) {
      return [r.naam + (r.aanbieder ? " (" + r.aanbieder + ")" : "") + (r.opzeg === "direct" ? " · nu al over te stappen" : r.einde ? " · loopt af " + fmtDatum(r.einde) : ""), eur(r.oud), eur(r.nieuw), eur(r.jaar1), eur(r.vanaf2), r.afgesloten ? "Afgesloten" : "Gevonden"];
    }) }),
    h("p", null, h("b", null, "Samen: " + eur(A.jaar1) + " besparing in jaar 1 en " + eur(A.vanaf2) + " per jaar vanaf jaar 2.")),
    h("p", null, "Vergoeding voor het zoeken en regelen: " + A.pct + "% van de besparing in jaar 1, eenmalig. Over de afgesloten aanbiedingen is dat " + eur(A.vergoedingAfgesloten) + (A.vergoeding > A.vergoedingAfgesloten ? " (nog " + eur(A.vergoeding - A.vergoedingAfgesloten) + " voor aanbiedingen die nog niet zijn afgesloten)" : "") + ". Je houdt dus " + eur(A.jaar1Afgesloten - A.vergoedingAfgesloten) + " in jaar 1 over van wat al is afgesloten. Vanaf jaar 2 is de hele besparing voor jou."),
    A.rijen.some(function (r) { return r.korting > 0; }) ? h("p", { className: "klein" }, "In jaar 1 zit eenmalige korting. Vanaf jaar 2 geldt de besparing zonder die korting. Controleer na een jaar of de prijs nog klopt; de aanbieder mag de prijs verhogen.") : null);
}
