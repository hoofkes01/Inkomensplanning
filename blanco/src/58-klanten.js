/* ===== Klanten: meerdere dossiers naast elkaar, zonder namen (alleen een neutrale code) ===== */
var KLANTEN_SLEUTEL = OPSLAG_VOORVOEGSEL + "klanten";

function klantenLees() {
  try { var r = JSON.parse(window.localStorage.getItem(KLANTEN_SLEUTEL) || "null"); if (r && Array.isArray(r.lijst)) return { lijst: r.lijst, teller: r.teller || r.lijst.length }; } catch (e) {}
  return { lijst: [], teller: 0 };
}
function klantenSchrijf(reg) {
  try { window.localStorage.setItem(KLANTEN_SLEUTEL, JSON.stringify(reg)); return true; }
  catch (e) { meldOpslagprobleem("schrijven", "Opslaan is mislukt (" + ((e && e.name) || "onbekende fout") + "). Maak nu een back-up en controleer de opslagruimte van je browser."); return false; }
}
function klantCodeVolgend(reg) { return "K-" + String(reg.teller + 1).padStart(3, "0"); }
function klantSleutels(id) {
  var voor = OPSLAG_VOORVOEGSEL + id + "_", uit = [];
  try { for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (k && k.indexOf(voor) === 0) uit.push(k); } } catch (e) {}
  return uit;
}
function klantMaak(reg, code, notitie, gegevens) {
  var n = reg.teller + 1, id = "k" + String(n).padStart(3, "0");
  var nu = Date.now();
  reg.teller = n;
  reg.lijst.push({ id: id, code: code || klantCodeVolgend({ teller: n - 1 }), notitie: notitie || "", gemaakt: nu, gewijzigd: nu });
  Object.keys(gegevens || {}).forEach(function (sl) { try { window.localStorage.setItem(OPSLAG_VOORVOEGSEL + id + "_" + sl, gegevens[sl]); } catch (e) {} });
  return id;
}
// Gegevens van vóór de klantenlijst (zonder klantvoorvoegsel) worden als klant overgenomen.
function klantenMigreer() {
  var vast = {}, gevonden = false;
  try {
    OPSLAG_SLEUTELS.forEach(function (sl) {
      var o = window.localStorage.getItem(OPSLAG_VOORVOEGSEL + sl);
      if (o !== null) { vast[sl] = o; gevonden = true; }
    });
    if (!gevonden) return;
    var reg = klantenLees();
    klantMaak(reg, null, "Overgenomen uit een eerdere versie of back-up.", vast);
    if (klantenSchrijf(reg)) Object.keys(vast).forEach(function (sl) { window.localStorage.removeItem(OPSLAG_VOORVOEGSEL + sl); });
  } catch (e) {}
}
function klantAanraken(id) {
  var reg = klantenLees();
  reg.lijst.forEach(function (k) { if (k.id === id) k.gewijzigd = Date.now(); });
  klantenSchrijf(reg);
}
function klantSamenvatting(id) {
  var uit = { type: "", intake: false };
  try {
    var p = JSON.parse(window.localStorage.getItem(OPSLAG_VOORVOEGSEL + id + "_profiel") || "null") || {};
    var t = HUISHOUDENS.filter(function (x) { return x[0] === p.type; })[0];
    uit.type = t ? t[1] : "";
    var i = JSON.parse(window.localStorage.getItem(OPSLAG_VOORVOEGSEL + id + "_intake") || "null") || {};
    uit.intake = !!(i.dashboard || {}).klaar;
  } catch (e) {}
  return uit;
}
function klantBestandsnaam(k) { return "klant-" + String(k.code).replace(/[^A-Za-z0-9\-]+/g, "") + "-" + isoDatum(vandaag()) + ".json"; }
function klantExporteer(k) {
  var gegevens = {}, voor = OPSLAG_VOORVOEGSEL + k.id + "_";
  klantSleutels(k.id).forEach(function (sl) { if (sl.indexOf(OPSLAG_VOORVOEGSEL + "_kapot_") !== 0) gegevens[OPSLAG_VOORVOEGSEL + sl.slice(voor.length)] = window.localStorage.getItem(sl); });
  var blob = new Blob([JSON.stringify({ app: "inkomensplanning-blanco", appVersie: APP_VERSIE, gemaakt: new Date().toISOString(), klantCode: k.code, gegevens: gegevens })], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = klantBestandsnaam(k);
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function klantImporteer(bestand, klaar) {
  var lezer = new FileReader();
  lezer.onload = function () {
    var b;
    try { b = JSON.parse(String(lezer.result)); } catch (e) { klaar("Dit bestand is geen geldige back-up."); return; }
    if (!b || b.app !== "inkomensplanning-blanco" || !b.gegevens) { klaar("Dit bestand is geen bestand van deze app."); return; }
    var gegevens = {}, hele = false;
    Object.keys(b.gegevens).forEach(function (k) {
      if (k === KLANTEN_SLEUTEL || /^inkomensplanning_k\d+_/.test(k)) hele = true;
      else if (k.indexOf(OPSLAG_VOORVOEGSEL) === 0 && OPSLAG_SLEUTELS.indexOf(k.slice(OPSLAG_VOORVOEGSEL.length)) >= 0) gegevens[k.slice(OPSLAG_VOORVOEGSEL.length)] = b.gegevens[k];
    });
    if (hele) { klaar("Dit is een back-up van alle klanten. Gebruik hiervoor 'Alles terugzetten' onderaan."); return; }
    if (!Object.keys(gegevens).length) { klaar("In dit bestand staan geen klantgegevens."); return; }
    var reg = klantenLees(), code = b.klantCode && !anoniemFout(b.klantCode) ? String(b.klantCode).slice(0, 40) : "";
    if (!code || reg.lijst.some(function (k) { return k.code === code; })) code = klantCodeVolgend(reg);
    klantMaak(reg, code, "Geïmporteerd uit bestand.", gegevens);
    klantenSchrijf(reg);
    klaar("Klant " + code + " is toegevoegd.", true);
  };
  lezer.onerror = function () { klaar("Het bestand kon niet worden gelezen."); };
  lezer.readAsText(bestand);
}

function Klantenlijst(p) {
  var sReg = useState(klantenLees), reg = sReg[0], setReg = sReg[1];
  var sZoek = useState(""), zoek = sZoek[0], setZoek = sZoek[1];
  var sNieuw = useState(false), nieuwOpen = sNieuw[0], setNieuwOpen = sNieuw[1];
  var sCode = useState(""), code = sCode[0], setCode = sCode[1];
  var sNot = useState(""), notitie = sNot[0], setNotitie = sNot[1];
  var sMeld = useState(""), melding = sMeld[0], setMelding = sMeld[1];
  var sEdit = useState(null), edit = sEdit[0], setEdit = sEdit[1];
  var sTik = useState(0), setTik = sTik[1];
  useEffect(function () { var t = setInterval(function () { setTik(function (x) { return x + 1; }); }, 3000); return function () { clearInterval(t); }; }, []);
  function ververs() { setReg(klantenLees()); }

  function codeFout(c, behalve) {
    var t = String(c || "").trim();
    if (!t) return "Vul een code in.";
    if (anoniemFout(t)) return "Dit is niet toegestaan (" + anoniemFout(t) + ").";
    if (reg.lijst.some(function (k) { return k.id !== behalve && k.code.toLowerCase() === t.toLowerCase(); })) return "Deze code bestaat al.";
    return "";
  }
  function maak() {
    var r = klantenLees(), c = code.trim() || klantCodeVolgend(r);
    if (codeFout(c)) return;
    var id = klantMaak(r, c, notitie.trim(), null);
    if (klantenSchrijf(r)) p.open(id);
  }
  function dupliceer(k) {
    var r = klantenLees(), gegevens = {}, voor = OPSLAG_VOORVOEGSEL + k.id + "_";
    klantSleutels(k.id).forEach(function (sl) { gegevens[sl.slice(voor.length)] = window.localStorage.getItem(sl); });
    var c = klantCodeVolgend(r);
    klantMaak(r, c, "Kopie van " + k.code + ".", gegevens);
    klantenSchrijf(r); ververs(); setMelding("Kopie gemaakt als " + c + ".");
  }
  function verwijder(k) {
    if (!window.confirm("Klant " + k.code + " definitief verwijderen? Maak eerst een back-up. Dit kan niet ongedaan worden gemaakt.")) return;
    klantSleutels(k.id).forEach(function (sl) { try { window.localStorage.removeItem(sl); } catch (e) {} });
    var r = klantenLees(); r.lijst = r.lijst.filter(function (x) { return x.id !== k.id; });
    klantenSchrijf(r); ververs(); setMelding("Klant " + k.code + " is verwijderd.");
  }
  function bewaarWijziging() {
    if (!edit) return;
    var f = codeFout(edit.code, edit.id);
    if (f) return;
    var r = klantenLees();
    r.lijst.forEach(function (k) { if (k.id === edit.id) { k.code = edit.code.trim(); k.notitie = edit.notitie.trim(); } });
    klantenSchrijf(r); setEdit(null); ververs();
  }

  var q = zoek.trim().toLowerCase();
  var rijen = reg.lijst.filter(function (k) { return !q || (k.code + " " + (k.notitie || "")).toLowerCase().indexOf(q) >= 0; })
    .sort(function (a, b) { return b.gewijzigd - a.gewijzigd; });
  var bm = backupMeta();

  return h("div", null,
    h("header", { className: "kop noprint" },
      h("div", { className: "titel" }, h("b", null, "Inkomensplanning"), h("small", null, "Klanten · App-versie " + APP_VERSIE))),
    h("main", { className: "pagina klantenlijst", "data-scherm": "klanten" },
      h(Kaart, { titel: "Klanten (" + reg.lijst.length + ")" },
        h("p", { className: "klein" }, "Elke klant heeft een eigen dossier onder een neutrale code. Gebruik nooit een naam, initialen, adres of nummer waaruit iemand te herkennen is. Houd zelf buiten de app een lijst bij die codes aan personen koppelt."),
        reg.lijst.length > 3 ? h(TekstVeld, { label: "Zoeken op code of notitie", value: zoek, onChange: setZoek, naam: "klant-zoek" }) : null,
        h("div", { className: "rij" },
          h(Knop, { onClick: function () { setNieuwOpen(!nieuwOpen); setCode(""); }, naam: "nieuwe-klant" }, "+ Nieuwe klant"),
          h("label", { className: "knop sec", style: { display: "inline-block", cursor: "pointer" } }, "Klantbestand importeren",
            h("input", { type: "file", accept: "application/json,.json", style: { display: "none" }, "data-veld": "klant-import", onChange: function (e) { var f = e.target.files[0]; if (f) klantImporteer(f, function (t, gelukt) { setMelding(t); if (gelukt) ververs(); }); e.target.value = ""; } }))),
        nieuwOpen ? h("div", { className: "kaart", "data-blok": "nieuwe-klant" },
          h(TekstVeld, { label: "Klantcode", hint: "Leeg laten geeft automatisch " + klantCodeVolgend(reg) + ". Geen naam of initialen.", value: code, onChange: setCode, naam: "klant-code", fout: code ? codeFout(code) : "" }),
          h(TekstVeld, { label: "Notitie (optioneel)", hint: "Bijvoorbeeld: 'pensioen over 2 jaar'. Geen persoonsgegevens.", value: notitie, onChange: setNotitie, naam: "klant-notitie" }),
          h("div", { className: "rij" }, h(Knop, { onClick: maak, naam: "klant-maak", disabled: !!(code && codeFout(code)) }, "Dossier aanmaken en openen"), h(Knop, { soort: "sec", onClick: function () { setNieuwOpen(false); }, naam: "klant-annuleer" }, "Annuleren"))) : null,
        melding ? h("p", { className: "klein", role: "status" }, melding) : null),
      reg.lijst.length ? h("div", null, rijen.map(function (k) {
        var sm = klantSamenvatting(k.id), bewerk = edit && edit.id === k.id;
        return h("section", { key: k.id, className: "kaart", "data-klant": k.id },
          bewerk ? h("div", null,
            h(TekstVeld, { label: "Klantcode", value: edit.code, onChange: function (v) { setEdit(Object.assign({}, edit, { code: v })); }, naam: "klant-code-wijzig", fout: codeFout(edit.code, edit.id) }),
            h(TekstVeld, { label: "Notitie", value: edit.notitie, onChange: function (v) { setEdit(Object.assign({}, edit, { notitie: v })); }, naam: "klant-notitie-wijzig" }),
            h("div", { className: "rij" }, h(Knop, { onClick: bewaarWijziging, naam: "klant-wijzig-ok", disabled: !!codeFout(edit.code, edit.id) }, "Opslaan"), h(Knop, { soort: "sec", onClick: function () { setEdit(null); }, naam: "klant-wijzig-annuleer" }, "Annuleren")))
          : h("div", null,
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: ".5rem", alignItems: "baseline" } },
              h("b", null, k.code), h("span", { className: "klein" }, "gewijzigd " + tijdTekst(k.gewijzigd))),
            h("div", { className: "klein" }, (sm.type || "Intake nog niet gedaan") + (sm.type && !sm.intake ? " · algemene intake niet afgerond" : "") + (k.notitie ? " · " + k.notitie : "")),
            h("div", { className: "rij", style: { marginTop: ".5rem" } },
              h(Knop, { onClick: function () { p.open(k.id); }, naam: "klant-open" }, "Openen"),
              h(Knop, { soort: "sec", klein: true, onClick: function () { setEdit({ id: k.id, code: k.code, notitie: k.notitie || "" }); }, naam: "klant-hernoem" }, "Code of notitie"),
              h(Knop, { soort: "sec", klein: true, onClick: function () { klantExporteer(k); }, naam: "klant-export" }, "Als bestand"),
              h(Knop, { soort: "sec", klein: true, onClick: function () { dupliceer(k); }, naam: "klant-kopie" }, "Dupliceren"),
              h(Knop, { soort: "gevaar", klein: true, onClick: function () { verwijder(k); }, naam: "klant-wis" }, "Verwijderen"))));
      }), rijen.length ? null : h("p", { className: "klein" }, "Geen klant gevonden.")) : h(Kaart, { soort: "leeg" }, h("p", null, "Er zijn nog geen klanten. Maak een nieuw dossier aan om te beginnen.")),
      h(Kaart, { titel: "Alle klanten samen opslaan" },
        h("p", { className: "klein" }, "De gegevens staan alleen in deze browser, op dit apparaat. Sla ze regelmatig op als bestand (ook via de balk linksonder) en bewaar dat bestand versleuteld: het bevat financiële gegevens van al je klanten."),
        h("div", { className: "rij" },
          h(Knop, { onClick: function () { bewaarBackup(); setTik(function (x) { return x + 1; }); setMelding("Back-up van alle klanten opgeslagen."); }, naam: "backup-opslaan" }, "Alles opslaan als bestand"),
          h("label", { className: "knop sec", style: { display: "inline-block", cursor: "pointer" } }, "Alles terugzetten",
            h("input", { type: "file", accept: "application/json,.json", style: { display: "none" }, "data-veld": "backup-bestand", onChange: function (e) { var f = e.target.files[0]; if (f) zetBackupTerug(f, setMelding); e.target.value = ""; } }))),
        h("p", { className: "klein" }, "Laatste back-up: " + (bm ? tijdTekst(bm.tijd) : "nog niet gemaakt") + "."))),
    h(BackupBalk, null));
}
