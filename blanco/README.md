# Inkomensplanning (blanco)

Planningstool voor een huishouden van één of twee personen: inkomen, vaste lasten, spaargeld, deposito's, beleggingen, pensioen, fiscaliteit, beleggingsadvies en een PDF-rapport. Blanco: geen persoonsgegevens of voorgevulde bedragen; elk menu begint met een korte intake.

- **Gebruik:** open `index.html` in de browser (ook los op een telefoon). Alle gegevens blijven lokaal in de browser (`localStorage`, voorvoegsel `inkomensplanning_`). Geen server, geen account.
- **Back-up:** Dashboard > "Gegevens opslaan als bestand" / "Gegevens terugzetten". Een nieuwe versie van de app is een nieuw bestand; zet daarna de back-up terug. De kop toont het versiestempel.
- **Bronbestanden:** `src/`. Samenvoegen tot `index.html`: `./build.sh` (zet ook het versiestempel).
- **Tests:** `node test/motor.test.js` (rekenmotor), `node test/browser.test.js`, `node test/gevuld.test.js [map]` en `node test/intake.test.js` (Playwright, Chromium; zet `NODE_PATH` naar de globale node_modules en `CHROMIUM` naar de chrome-binary).
- **Jaarlijks bijwerken:** fiscale tabel in `src/20-fiscaal.js` (`FISCAAL_PER_JAAR`, `FISCAAL_TABEL_STAND`), fondsenlijst en ISIN's in `src/40-advies.js`, marktbeeld in `ADVIES_MARKT_STANDAARD`. Controleer box 3, AOW (SVB, januari en juli) en AOW-leeftijd.
- Rekenvoorbeelden, geen persoonlijk financieel of fiscaal advies.
