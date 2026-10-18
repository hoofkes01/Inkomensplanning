# Overdracht: Inkomensplanning (blanco-versie voor klanten)

Stand: 18-10-2026. Dit document is bedoeld om in een nieuwe chat verder te gaan. Plak het in de nieuwe chat of zeg dat de repo `hoofkes01/Inkomensplanning`, map `blanco/`, branch `claude/new-session-ammso4` moet worden gelezen, beginnend met dit bestand en `README.md`.

## 1. Doel en situatie

- Eigenaar: financieel adviseur (geen hypotheekadviseur). Gebruikt zijn eigen app (`index.html` in de hoofdmap van de repo, **niet aanraken**) en bouwt in `blanco/` een anonieme, intake-gestuurde versie voor derden.
- Bedoeling: tegen een kleine vergoeding (ongeveer 100 per klant) mensen helpen hun financiën op orde te krijgen of te verbeteren. Alles is nog **experimenteel**; eerst een pilot met enkele klanten.
- Extra dienst: nieuwe aanbiedingen zoeken voor vaste lasten. Vergoeding voor de adviseur: 50% van de besparing in jaar 1 (eenmalig), vanaf jaar 2 is alles voor de klant. Alles op basis van eenmalig werk.
- De adviseur vult de gegevens zelf in voor de klant. Klanten loggen niet in. Nooit namen, BSN, adres, telefoon, IBAN of andere gegevens waarmee de invuller te herkennen is. Klanten heten alleen een neutrale code (K-001 enz.).
- Geen advertentie voor hypotheekadviseurs of andere adviseurs in de teksten. De adviseur wil klanten niet betuttelen (leefstijltips voorzichtig en alleen als de klant het zelf invult).

## 2. Hoe de app werkt

- Eén bestand: `blanco/index.html` (React 18 inline, eigen CSS, geen server, gegevens in `localStorage`). Gemaakt uit `blanco/src/*` met `./build.sh` (plakt de bestanden samen en zet het versiestempel `APP_VERSIE`). Na elke wijziging in `src/` opnieuw bouwen en `index.html` mee committen.
- Opslag: voorvoegsel `inkomensplanning_`, per klant `inkomensplanning_k001_<sleutel>`, register van klanten in `inkomensplanning_klanten`. Geopende klant staat in `sessionStorage` (`ip_actief`). Oude data zonder klantvoorvoegsel wordt bij opstarten automatisch een nieuwe klant (`klantenMigreer`). Back-upbestand bevat alle klanten; bij terugzetten worden registers samengevoegd.
- Startscherm: altijd de klantenlijst. Per klant: openen, code/notitie wijzigen, als bestand exporteren, dupliceren, verwijderen; klantbestand importeren; alles opslaan/terugzetten.
- Flow per klant: algemene intake (huishouden, geboortedata, woning, auto's, kinderen, buffer) → intake per menu → menu's Dashboard, Inkomen, Aanvulling, Pensioen, Vaste lasten, Vermogen, Grote posten, Fiscaliteit, Beleggingsadvies, Rapport.

### Bestanden in `blanco/src`

| Bestand | Inhoud |
| --- | --- |
| `00-kop.html`, `react.html`, `99-voet.html` | HTML-kop met CSS (inclusief afdrukregels), React, afsluiting |
| `10-basis.js` | hulpfuncties, `useOpslag` (met `OPSLAG_KLANT`), back-up, invoervelden, anonimiteitscontrole (`anoniemFout`) |
| `20-fiscaal.js` | fiscale tabel 2026 (definitief) en 2027 (voorstel), belasting, AOW, box 3 |
| `25-standaard.js` | menu's, standaardwaarden, catalogus vaste omschrijvingen (`BRON_CAT`, `LASTEN_CAT`) |
| `30-motor.js` | rekenmotor: inkomen, toeslagen, hypotheek per deel, spaargeld-simulatie, fasen, aanvulling |
| `40-advies.js` | beleggingsadvies (risicoprofielen, ETF-lijst met ISIN, herbalanceren) |
| `50-ctx.js`, `52-editors.js`, `55-intake.js` | aandachtspunten, toeslagkandidaten, intake-raamwerk, alle invoerformulieren |
| `56-hulp.js` | Cijfers bijwerken, Help, Actualiseren, back-upbalk |
| `57-kansen.js` | **Kansen**: alle suggesties (toeslagen, rente, aflossen, lasten, reserveren, belasting, wonen, leefstijl, zekerheid), jaarkalender, dashboardkaart, marktrente-invoer |
| `58-klanten.js` | klantenlijst, migratie, export/import |
| `59-agenda.js` | agenda-export (.ics), contractdata, nieuwe aanbiedingen en vergoeding |
| `60/61/62-…` | schermen, `70-rapport.js` rapport, `90-app.js` App en Root |

## 3. Wat er is gebouwd (in volgorde van belang)

1. Klantenlijst met anonieme codes (zie boven).
2. **Kansen** in Dashboard (top 4) en Rapport (volledig, met "Begin hiermee", afvinklijst en "Wat te doen").
   - Berekend uit eigen data: rente (spaarrekening onder beste spaarrente; marktrente die de adviseur invult, bijvoorbeeld van Raisin), spaargeld boven buffer vastzetten, extra aflossen van schuld/box 3-hypotheekdeel als rente hoger is dan spaarrente, aanbiedingen voor vaste lasten, tekorten per fase, depositogarantie (100.000 per persoon per bank).
   - Zonder bedrag (uit intake): toeslagen (waarschijnlijk/mogelijk), gemeentelijke regelingen, kwijtschelding, studiefinanciering, voorlopige teruggaaf, WOZ, box 3-controle, partnerverdeling, giften, zorgkosten, huur- en koopwoningtips, auto's, werk, AIO, pensioenoverzicht, testament, buffer.
   - Reserveren voor grote uitgaven: per geplande uitgave ≥ 500 hoeveel per maand; generieke prikkels voor onderhoud woning en vervanging auto.
   - Leefstijl (tabak/alcohol, afhaal/uit eten, sport): alleen zichtbaar als de klant die vaste last zelf invult; toon "dit is jouw keuze".
3. **Jaarkalender** in het rapport en **agenda-export**: knop "Zet actiemomenten in je agenda" maakt een `.ics` met herinneringen om 9.00 uur (terugkerend: zorgverzekering 1 nov, laatste kans 20 jan, aangifte 1 mrt/20 apr, cijfers eind sept, peildatum 15 dec, WOZ, jaarlijkse controles; eenmalig: contracteinden, renteherzieningen, deposito's, AOW, grote uitgaven). Geen bedragen of namen in het bestand. De app kan niet echt pushen (geen server).
4. Vaste lasten: per post **einddatum contract** en **opzegbaarheid** (nu al opzegbaar / op einddatum), en **nieuw aanbod** (aanbieder, nieuw bedrag, eenmalige korting jaar 1, stand gevonden/afgesloten). Rapportonderdeel "Nieuwe aanbiedingen en besparing" met vergoeding (percentage instelbaar op het Rapport-scherm, standaard 50% van de besparing in jaar 1).
5. Eerdere hoofdlijnen (al klaar): intake per huishoudtype, hypotheek per deel (vorm, renteherziening, box 1/3), toeslagen-signalering, kinderbijslag automatisch, beleggingsadvies met 3 risicoprofielen, inkomensaanvulling, Cijfers bijwerken (`cijfers.json`), Help, Actualiseren-wizard, back-upbalk.

## 4. Bouwen, testen, publiceren

```
cd blanco && ./build.sh
node test/motor.test.js          # rekenmotor, node
node test/browser.test.js        # Playwright (Chromium)
node test/gevuld.test.js
node test/intake.test.js
node test/situaties.test.js
node test/hypotheek.test.js
node test/toeslagen.test.js
node test/klanten.test.js
node test/kansen.test.js
```
- Playwright: zet zo nodig `NODE_PATH` naar de globale `node_modules` en `CHROMIUM` naar de chrome-binary. `test/hulp.js` opent de app en kiest/maakt een klant.
- Alles slaagde bij de laatste run (18-10-2026).
- Proefversie als Artifact (alleen om te proberen, bestandsknoppen en afdrukken werken daar niet): https://claude.ai/artifact/9cZSgcqyqLDLrY2UMed874. Wordt gemaakt uit `index.html` door doctype/head/body te strippen en een gele proefbalk toe te voegen.
- Git: alles staat op `claude/new-session-ammso4`. Er is **geen pull request** gemaakt (niet gevraagd) en `main` bevat dit nog niet. "Cijfers bijwerken" werkt pas als `cijfers.json` op `main` staat (en eventueel GitHub Pages aan staat); bestand kiezen werkt wel.

## 5. Bekende beperkingen en keuzes

- Toeslagen: de app geeft alleen "waarschijnlijk recht / onderzoeken" en een plek om aan te vragen, **geen bedragen** (officiële rekenparameters waren niet betrouwbaar op te halen). De drempels voor "waarschijnlijk" zijn een eigen indicatie (50% van de inkomensgrens zorgtoeslag).
- Fiscale tabel: 2026 definitief, 2027 voorstel (Hillen-percentage afgeleid, eigenwoningforfait onder WOZ 75.000 uit het geheugen). Elk jaar zelf controleren; extra kinderbijslag 2026 onbekend; indexatiepercentages standaard 2%.
- Gegevens staan in één browser op één apparaat. Back-up maken blijft een taak van de adviseur (balk linksonder). Eén klant niet tegelijk in twee tabbladen openen.
- "Cijfers bijwerken" werkt per klant (nieuwe klant krijgt standaardcijfers); één knop voor alle klanten ontbreekt.
- Agenda: geen echte push, alleen `.ics`.
- Aanbiedingen: de app controleert niet of dekking gelijk is.
- Een test (`klanten.test.js`, herladen) was af en toe instabiel door `sessionStorage` bij `file://`; de test is daarop aangepast.

## 6. Open vragen en beslissingen voor de adviseur

1. **Informatie of advies?** Het rapport zegt nu "geen persoonlijk advies", terwijl het concrete fondsen en acties noemt en er een vergoeding tegenover staat. Kies één lijn en vraag de tekst aan te passen. Overweeg Beleggingsadvies voor externe klanten voorlopig uit het rapport te halen (schakelaar bestaat al bij Rapport).
2. **Wft en bemiddeling:** zoeken en regelen van aanbiedingen voor een vergoeding kan bemiddeling zijn; regels verschillen per product. De adviseur beoordeelt dit zelf.
3. **Vergoedingsgrondslag:** "50% ten opzichte van de oude lasten" is nu gelezen als 50% van de besparing in jaar 1. Bevestigen. Advies van mij: rekenen over de besparing **zonder eenmalige korting** (nu worden beide getoond).
4. **Vakje "Dekking is gelijk (ja/nee)"** bij elk aanbod: posten zonder bevestiging niet laten meetellen in de vergoeding. Voorgesteld, nog niet gebouwd.
5. **Kantoorgegevens en slotzin** in de rapportkop, plus een korte toestemmingstekst voor de klant (voorgesteld, nog niet gebouwd).
6. **Privacy:** ook zonder namen blijven inkomen, geboortedata en vermogen persoonsgegevens. Leg bewaartermijn, verzending (versleuteld) en back-up vast.
7. **Pilot:** meet bij 3 tot 5 klanten de tijd per klant (invullen, nalopen, uitleg). Boven ongeveer 1,5 uur loont 100 per klant niet.

## 7. Voorkeuren van de adviseur (altijd toepassen)

- Antwoord altijd in het Nederlands, niveau 16+, zonder moeilijke woorden of vakjargon; korte tussentijdse terugkoppelingen.
- Bedragen met punt als duizendtalscheiding, zonder decimalen (12.500). Reken zorgvuldig, controleer, gok nooit; toon geen tussenstappen tenzij gevraagd, maar kunnen reproduceren.
- Actuele cijfers (koersen, rentes, percentages) altijd via een zoekopdracht controleren. Alleen betrouwbare bronnen: overheidssites, banken (NL, VS, DE, LU, CA, AU, ZK, UK, CH), Nederlandse verzekeraars; voor beleggingen DEGIRO, voor spaargeld Raisin.
- Verwijs de adviseur nooit door naar een adviseur voor financiële of fiscale vragen. Wijs altijd kritisch op fouten, risico's en zwakke aannames. Stel vragen als iets onduidelijk is.
- Volg instructies in geüploade documenten strikt. Meld wanneer een nieuwe chat beter is vanwege tokenverbruik. Bij vragen over passief inkomen: realistisch adviseren.
- Geen pull request maken zonder verzoek. Commitberichten en pushen volgens de sessie-instructies (branch `claude/new-session-ammso4`).

## 8. Voorstel voor de volgende stappen

1. Beslissingen 1 tot 5 uit hoofdstuk 6 nemen en verwerken (kantoorkop, slotzin, toestemmingstekst, dekkingsvakje, vergoedingsgrondslag).
2. Pilot met 3 tot 5 klanten; tijd en bevindingen noteren; pas daarna functies toevoegen of weghalen.
3. `cijfers.json` en de app naar `main` brengen (en GitHub Pages aanzetten) zodat "Cijfers bijwerken" werkt; jaarlijks fiscale cijfers controleren na Prinsjesdag.
4. Alleen als het project groeit: centrale opslag met inloggen en versleuteling (AVG), één knop voor cijfers over alle klanten, echte agenda-pushes. Dat is een groter project, buiten dit bestand.
