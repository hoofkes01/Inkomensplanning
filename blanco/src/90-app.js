/* ===== De app zelf ===== */
var OPSLAG_SLEUTELS = ["profiel", "inst", "bronnen", "werkJaren", "aanv", "potten", "hyp", "lasten", "dagelijks", "verm", "grote", "fiscOverride", "box3", "advies", "rapport", "intake"];
var SCHERMEN = { dashboard: SchermDashboard, inkomen: SchermInkomen, aanvulling: SchermAanvulling, pensioen: SchermPensioen, lasten: SchermLasten, vermogen: SchermVermogen, grote: SchermGrote, fiscaal: SchermFiscaal, advies: SchermAdvies, rapport: SchermRapport };

class Foutvanger extends React.Component {
  constructor(p) { super(p); this.state = { fout: null }; }
  static getDerivedStateFromError(e) { return { fout: e }; }
  componentDidCatch(e) { console.error("Schermfout", e); }
  componentDidUpdate(vorige) { if (vorige.sleutel !== this.props.sleutel && this.state.fout) this.setState({ fout: null }); }
  render() {
    if (this.state.fout) return h("div", { className: "kaart fout", role: "alert" }, h("h2", null, "Er ging iets mis op dit scherm"), h("p", null, String(this.state.fout && this.state.fout.message || this.state.fout)), h("p", { className: "klein" }, "Je gegevens zijn niet verloren. Kies een ander onderwerp via het menu, of zet een back-up terug."));
    return this.props.children;
  }
}

function setPad(obj, pad, waarde) {
  if (!pad.length) return waarde;
  var kopie = Array.isArray(obj) ? obj.slice() : Object.assign({}, obj || {});
  kopie[pad[0]] = setPad(kopie[pad[0]], pad.slice(1), waarde);
  return kopie;
}

function App() {
  var stores = {};
  OPSLAG_SLEUTELS.forEach(function (k) { stores[k] = useOpslag(k, STANDAARD[k]); });
  var S = {}; OPSLAG_SLEUTELS.forEach(function (k) { S[k] = stores[k][0]; });
  var sNu = useState(function () { return vandaag(); }), nu = sNu[0];
  var sSch = useState("dashboard"), scherm = sSch[0], setScherm = sSch[1];
  var sMenu = useState(false), menuOpen = sMenu[0], setMenuOpen = sMenu[1];
  var sInt = useState(null), intakeOpen = sInt[0], setIntakeOpen = sInt[1];
  var sTik = useState(0), setTik = sTik[1];
  useEffect(function () { opslagLuisteraars.push(function () { setTik(function (x) { return x + 1; }); }); }, []);

  var deps = OPSLAG_SLEUTELS.map(function (k) { return S[k]; });
  var m = useMemo(function () { return maakModel(S, nu); }, deps);
  var sim = useMemo(function () { return maakSim(m); }, [m]);
  var vr = useMemo(function () { return vermogenReeks(m, sim); }, [m, sim]);

  function zet(k, patch) { stores[k][1](function (prev) { return Object.assign({}, prev, patch); }); }
  function zetPad(k, pad, waarde) { stores[k][1](function (prev) { return setPad(prev, pad, waarde); }); }
  function lijst(k, sub) {
    var items = sub ? (S[k][sub] || []) : S[k];
    var set = stores[k][1];
    function upd(fn) { set(function (prev) { if (sub) { var o = Object.assign({}, prev); o[sub] = fn(prev[sub] || []); return o; } return fn(prev); }); }
    return {
      items: Array.isArray(items) ? items : [],
      voeg: function (it) { upd(function (a) { return a.concat([it]); }); },
      wijzig: function (id, patch) { upd(function (a) { return a.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }); }); },
      wis: function (id) { upd(function (a) { return a.filter(function (x) { return x.id !== id; }); }); }
    };
  }
  function nav(id) { setScherm(id); setMenuOpen(false); setIntakeOpen(null); try { window.scrollTo(0, 0); } catch (e) {} }
  function openIntake(id) { setIntakeOpen(id); }

  useEffect(function () {
    if (!(S.intake[scherm] || {}).gezien) setIntakeOpen(scherm);
  }, [scherm]);

  var c = { S: S, m: m, sim: sim, vr: vr, zet: zet, zetPad: zetPad, lijst: lijst, nav: nav, openIntake: openIntake };
  var Scherm = SCHERMEN[scherm];
  var meldingen = Object.keys(OPSLAG_MELDINGEN).map(function (k) { return OPSLAG_MELDINGEN[k]; });
  var klaar = MENUS.filter(function (x) { return (S.intake[x.id] || {}).klaar; }).length;
  var naam = MENUS.filter(function (x) { return x.id === scherm; })[0].naam;

  return h(Ctx.Provider, { value: c },
    h("header", { className: "kop noprint" },
      h("div", { className: "titel" }, h("b", null, "Inkomensplanning"), h("small", null, naam + " · App-versie " + APP_VERSIE)),
      h("button", { type: "button", className: "menuknop", onClick: function () { setMenuOpen(true); }, "data-knop": "menu", "aria-haspopup": "true" }, "☰ Menu")),
    menuOpen ? h("div", { className: "menulaag noprint", onClick: function (e) { if (e.target === e.currentTarget) setMenuOpen(false); } },
      h("nav", { className: "menulijst", "aria-label": "Onderwerpen" },
        h("div", { className: "rij tussen", style: { marginBottom: ".5rem" } }, h("b", null, "Kies een onderwerp"), h(Knop, { soort: "sec", klein: true, onClick: function () { setMenuOpen(false); } }, "Sluiten")),
        MENUS.map(function (x) {
          var st = S.intake[x.id] || {};
          return h("button", { key: x.id, type: "button", className: "item" + (x.id === scherm ? " actief" : ""), "data-menu": x.id, onClick: function () { nav(x.id); } },
            h("span", null, x.naam), h("span", { className: "klein" }, st.klaar ? "✓" : ""));
        }),
        h("p", { className: "klein" }, "Intake: " + klaar + " van " + MENUS.length + " voltooid"))) : null,
    h("main", { className: "pagina" }, h(Foutvanger, { sleutel: scherm }, h(Scherm, null))),
    intakeOpen ? h(IntakeModal, { key: intakeOpen, menu: intakeOpen, sluit: function () { setIntakeOpen(null); } }) : null,
    meldingen.length ? h("div", { className: "melding noprint", role: "alert" }, meldingen.map(function (t, i) { return h("div", { key: i }, t); })) : null);
}
ReactDOM.createRoot(document.getElementById("root")).render(h(App, null));
window.addEventListener("error", function (e) { try { var d = document.createElement("div"); d.className = "melding"; d.textContent = "Fout in de app: " + e.message; document.body.appendChild(d); } catch (x) {} });
