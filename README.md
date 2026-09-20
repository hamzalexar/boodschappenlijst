# Boodschappenlijst

Een gedeelde, realtime boodschappenlijst voor het gezin. Geen accounts, geen
inlog: iedereen met de link kan meelezen en meebewerken, en wijzigingen
verschijnen direct op alle telefoons.

Puur HTML, CSS en vanilla JavaScript — geen framework, geen build-stap.
Data wordt gedeeld via [Firebase Firestore](https://firebase.google.com/docs/firestore)
en de site is gratis te hosten via GitHub Pages.

## Gebruik

- Terwijl je een productnaam typt, herkent de app veelvoorkomende
  boodschappen (bijv. "melk" → Zuivel) en vult de categorie automatisch in.
  Herkent de app het product niet, dan moet je zelf een categorie kiezen
  voordat je kunt toevoegen — de app raadt nooit zomaar. Kies je zelf een
  andere categorie, dan blijft die staan, ook als je de naam nog aanpast.
  De woordenlijst staat in [`product-categorieen.js`](product-categorieen.js)
  en is makkelijk uit te breiden.
- Open de site. Bij het allereerste bezoek maakt de app automatisch een
  nieuwe, lege lijst aan met een lange, willekeurige code in de link
  (bijv. `?lijst=Ab3xQ...`).
- Klik op **"Deel deze lijst"** om die link te kopiëren (of, op een telefoon,
  te delen via het systeem-deelmenu). Stuur die link naar je gezinsleden.
- Iedereen die de link opent, ziet en bewerkt dezelfde lijst. Toevoegen,
  afvinken en verwijderen verschijnt direct bij iedereen — niemand hoeft te
  verversen.
- De app onthoudt in je browser welke lijst je het laatst gebruikte, dus als
  je de site zonder link opnieuw opent, kom je automatisch weer in je eigen
  lijst terecht.
- De app werkt ook offline (bijv. slechte ontvangst in de winkel): items die
  je toevoegt of afvinkt worden bewaard en gesynchroniseerd zodra er weer
  verbinding is. De statusindicator rechtsboven toont Online/Offline.
- Onderaan de pagina staat een link **"Bekijk koopstatistieken"**: die toont
  per product hoe vaak je het hebt afgevinkt en wanneer voor het laatst.
  Producten met dezelfde naam (ongeacht hoofdletters/spaties) worden
  samengevoegd.
- Elk item heeft een **aantal** (× 1, × 2, …), altijd zichtbaar en altijd
  aan te passen — ook nadat je het hebt afgevinkt, voor als je er
  bijvoorbeeld toch meer of minder van meeneemt dan gepland.
- Zodra je een item afvinkt, verschijnen er twee optionele velden: **Prijs
  per stuk** en **Winkel** — de focus springt er automatisch naartoe als
  zachte herinnering om de prijs meteen in te vullen. De prijs is altijd
  de prijs van één stuk; vermenigvuldigd met het aantal vind je het totaal
  van dat item terug. De **winkel** hoef je maar
  één keer per bezoek te typen: de eerste winkel die je invult, wordt die
  sessie onthouden en automatisch toegepast op alle andere items die je
  daarna afvinkt (ook met terugwerkende kracht op al-afgevinkte items).
  Kies je voor één item bewust een andere winkel, dan blijft die uitzondering
  beperkt tot dat ene item. De winkel-suggesties bevatten bekende Belgische
  ketens (Colruyt, Delhaize, Carrefour, Aldi, Lidl, …) plus winkels die je
  zelf eerder hebt ingevuld — zie [`winkels-belgie.js`](winkels-belgie.js).
  Deze velden blijven optioneel: laat je ze leeg, dan telt het item nog
  gewoon mee voor "hoe vaak gekocht".
- Vul je een prijs én winkel in, en blijkt uit jullie eigen geschiedenis dat
  je hetzelfde product ooit €0,30 of meer goedkoper hebt gekocht bij een
  andere winkel, dan verschijnt er kort een melding onderin het scherm.
- Boven de teller verschijnt een **Totaal** zodra je afgevinkte items met
  een prijs hebt: de som van prijs × aantal van alles wat je tot nu toe in
  je kar hebt. Handig om tijdens het shoppen in de gaten te houden, en
  gaat vanzelf terug naar niets zodra je "Wis afgevinkte items" gebruikt.
- Op de statistiekenpagina zie je, naast een vergelijking tussen winkels
  per product (goedkoopste bovenaan, 🏆), ook een grafiek **"Uitgaven per
  maand"**: het totaalbedrag per kalendermaand waarin je prijzen hebt
  ingevuld. Met de dropdown erboven filter je op één categorie (bijv. alleen
  "Dranken"), om te zien wat je daaraan per maand uitgeeft.
- Staat een product verkeerd gecategoriseerd (bijv. onder "Overig" terwijl
  het eigenlijk Zuivel is)? Ga naar **"🏷️ Categorieën corrigeren"** onderaan
  de statistiekenpagina. Die aparte Producten-pagina toont elk product dat
  je ooit hebt gekocht met een dropdown; wijzig je die, dan wordt dat met
  terugwerkende kracht toegepast op **alle** eerdere aankopen van dat
  product in de geschiedenis (dus ook meteen zichtbaar in de grafieken).
  Dit corrigeert alleen de geschiedenis, niet de automatische herkenning
  bij het toevoegen (zie [`product-categorieen.js`](product-categorieen.js)
  als je die zelf wilt verbeteren).

### ⚠️ De link is privé — behandel hem als een wachtwoord

Iedereen die de lijst-link heeft, kan de lijst volledig bewerken. Er is geen
inlog of extra beveiliging — de lange, willekeurige code in de link is de
enige bescherming. Deel de link dus alleen rechtstreeks met je gezinsleden
(bijv. via WhatsApp), en niet op een openbare plek.

### Installeren als app (PWA)

- **iPhone (Safari):** open de site → deelicoon → "Zet op beginscherm".
- **Android (Chrome):** open de site → menu (⋮) → "Toevoegen aan startscherm".

De app opent daarna zonder browserbalk, met een eigen icoon.

## Firebase-project opzetten

Deze stappen doe je eenmalig in de [Firebase-console](https://console.firebase.google.com):

1. **Project aanmaken** → "Project toevoegen", Google Analytics mag uit.
2. **Firestore Database aanzetten**: Build → Firestore Database → Database
   maken → kies een regio → start in productiemodus.
3. **Beveiligingsregels plakken**: tabblad "Rules" in Firestore Database →
   plak de inhoud van [`firestore.rules`](firestore.rules) uit deze repo →
   Publish. Zie hieronder waarom deze regels veilig zijn.
4. **Web-app registreren**: Projectinstellingen (tandwiel) → "Jouw apps" →
   web-icoon (`</>`) → app registreren (Firebase Hosting hoeft niet
   aangevinkt). Je krijgt een `firebaseConfig`-object te zien.
5. Zet die waarden in [`firebase-config.js`](firebase-config.js) in deze
   repo.

## Waarom de Firebase-config geen geheim is

`firebase-config.js` staat gewoon in de repository en wordt door elke
bezoeker in de browser gedownload — dat is normaal en bedoeld voor
Firebase-webapps. Deze config bevat geen wachtwoord; het is alleen een
adres waarmee de browser weet met welk Firebase-project hij moet praten.

De echte beveiliging zit in [`firestore.rules`](firestore.rules): die regels
geven alleen toegang tot het pad `lijsten/{lijstCode}/items`, en er is geen
regel voor de `lijsten`-collectie zelf. Dat betekent dat niemand alle
lijst-codes kan opsommen of een lijst kan vinden zonder de exacte,
willekeurige code uit de link te kennen — precies zoals bij een gedeelde
link naar bijvoorbeeld een Google Doc.

### GitHub geeft een "Possible valid secret detected"-melding — dat is normaal

GitHub's geautomatiseerde secret-scanner herkent elke string die op een
Google API-key lijkt en waarschuwt altijd, ongeacht de context. Voor een
Firebase-webconfig is dat een verwachte, onschuldige melding — zie hierboven
waarom. Je kunt hem in de repository onder **Security → Secret scanning
alerts** afsluiten als "False positive" of "Won't fix".

Wil je extra hardening, los van de Firestore-regels? Ga naar
[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
(zelfde project) en beperk de API-key onder "Application restrictions" tot
je eigen domein (bijv. `https://<jouw-gebruikersnaam>.github.io/*`), zodat
de key sowieso nergens anders werkt.

## GitHub Pages activeren

1. Push deze repository naar GitHub (als dat nog niet is gebeurd).
2. Ga naar **Settings → Pages** in de GitHub-repository.
3. Kies bij "Source" de branch `main` en map `/ (root)`.
4. Sla op. Na een minuut is de site bereikbaar op
   `https://<jouw-gebruikersnaam>.github.io/<repo-naam>/`.

Omdat er geen build-stap is, is elke `git push` naar `main` automatisch
live.

## Projectstructuur

| Bestand              | Doel                                              |
| --------------------- | -------------------------------------------------- |
| `index.html`          | Pagina-structuur van de lijst                      |
| `statistieken.html`   | Pagina-structuur van de statistieken                |
| `producten.html`      | Pagina-structuur van de categorie-correctie         |
| `style.css`           | Styling (mobile-first, licht + donker thema)       |
| `app.js`              | Lijstlogica: Firestore, toevoegen/afvinken, UI     |
| `statistieken.js`     | Logica voor de statistiekenpagina                  |
| `producten.js`        | Logica voor het corrigeren van categorieën         |
| `lijst-code.js`       | Gedeeld: bepaalt de lijst-code uit URL/localStorage |
| `categorieen.js`      | Gedeeld: de vaste lijst met categorieën             |
| `firebase-config.js`  | Jouw Firebase-projectgegevens                      |
| `firestore.rules`     | Beveiligingsregels voor Firestore                  |
| `manifest.json`       | PWA-manifest (naam, iconen, kleuren)               |
| `service-worker.js`   | Cachet de app-shell voor offline gebruik            |
| `icons/`              | App-iconen (SVG + PNG)                             |

Firestore-structuur per lijst:

```
lijsten/{lijstCode}/items/{itemId}         → huidige boodschappenlijst
lijsten/{lijstCode}/geschiedenis/{id}      → log van elke keer dat iets is afgevinkt
```

## Later uit te breiden

De code is bewust simpel gehouden zodat dit makkelijk kan worden
toegevoegd:

- Meerdere lijsten per gezin (bijv. boodschappen + klusjes)
- Suggesties op basis van veelgekochte items
- Sorteren op looproute in de winkel
- Echte inlog, mocht dat later nodig zijn
