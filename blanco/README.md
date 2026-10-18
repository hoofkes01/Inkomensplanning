# Inkomensplanning (blanco)

Planningstool voor een huishouden van één of twee personen: inkomen, vaste lasten, spaargeld, deposito's, beleggingen, pensioen, fiscaliteit, beleggingsadvies en een PDF-rapport. Blanco: geen persoonsgegevens of voorgevulde bedragen; elk menu begint met een korte intake.

- **Gebruik:** open `index.html` in de browser (ook los op een telefoon). Alle gegevens blijven lokaal in de browser (`localStorage`, voorvoegsel `inkomensplanning_`). Geen server, geen account.
- **Cijfers actueel houden:** de knop 'Cijfers bijwerken' (Dashboard, Fiscaliteit, Vaste lasten) haalt `cijfers.json` op (GitHub Pages, daarna raw.githubusercontent.com van `main`) en past belastingtabel, AOW, box 3, CPI, rentes, marktbeeld en fondsrendement toe. Zonder verbinding kan het bestand ook worden gekozen. Publiceer bij elke wijziging een nieuwe `cijfers.json` (veld `versie` = datum). Zie ook `CIJFERS_URLS` in `src/56-hulp.js`.
- **Anoniem:** tekstvelden weigeren e-mail, postcode, telefoon, IBAN, adres en nummers van 9 cijfers; personen heten Man/Vrouw/Man 1/Vrouw 2; lasten en inkomsten hebben vaste omschrijvingen (`src/25-standaard.js`).
- **Back-up:** Dashboard > "Gegevens opslaan als bestand" / "Gegevens terugzetten". Een nieuwe versie van de app is een nieuw bestand; zet daarna de back-up terug. De kop toont het versiestempel.
- **Bronbestanden:** `src/`. Samenvoegen tot `index.html`: `./build.sh` (zet ook het versiestempel).
- **Tests:** `node test/motor.test.js` (rekenmotor), `node test/browser.test.js`, `node test/gevuld.test.js [map]` en `node test/intake.test.js` (Playwright, Chromium; zet `NODE_PATH` naar de globale node_modules en `CHROMIUM` naar de chrome-binary).
- **Jaarlijks bijwerken:** fiscale tabel in `src/20-fiscaal.js` (`FISCAAL_PER_JAAR`, `FISCAAL_TABEL_STAND`), fondsenlijst en ISIN's in `src/40-advies.js`, marktbeeld in `ADVIES_MARKT_STANDAARD`. Controleer box 3, AOW (SVB, januari en juli) en AOW-leeftijd.
- Rekenvoorbeelden, geen persoonlijk financieel of fiscaal advies.
