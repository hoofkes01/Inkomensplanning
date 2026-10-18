// Laadt de rekenbestanden in Node (zonder browser) voor tests.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { console, Math, Date, JSON, Object, Array, Number, String, isFinite, parseInt, setTimeout, RegExp, Intl, Error };
ctx.React = { createElement() {}, useState() {}, useEffect() {}, useMemo() {}, useRef() {}, useContext() {} };
ctx.window = { localStorage: { getItem() { return null; }, setItem() {} } };
ctx.document = {};
ctx.APP_VERSIE = "01-01-2026 · 00:00";
vm.createContext(ctx);
const src = path.join(__dirname, "..", "src");
["10-basis.js", "20-fiscaal.js", "25-standaard.js", "30-motor.js", "40-advies.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(src, f), "utf8"), ctx, { filename: f }));
module.exports = ctx;
