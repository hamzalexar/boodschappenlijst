import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { bepaalLijstCode } from "./lijst-code.js";
import { CATEGORIE_VOLGORDE } from "./categorieen.js";

const statusIndicator = document.getElementById("status-indicator");
const statusLabel = statusIndicator.querySelector(".status__label");
const emptyState = document.getElementById("empty-state");
const tabsEl = document.getElementById("stats-tabs");
const tabKnoppen = tabsEl.querySelectorAll(".stats-tab");
const paneelMaand = document.getElementById("paneel-maand");
const paneelProduct = document.getElementById("paneel-product");
const maandLijst = document.getElementById("maand-lijst");
const maandLeeg = document.getElementById("maand-leeg");
const maandFilter = document.getElementById("maand-categorie-filter");
const productZoek = document.getElementById("product-zoek");
const productCategorieFilter = document.getElementById("product-categorie-filter");
const productSorteer = document.getElementById("product-sorteer");
const productTeller = document.getElementById("product-teller");
const productLijst = document.getElementById("stats-list");
const productLeeg = document.getElementById("product-leeg");
const productMeer = document.getElementById("product-meer");
const terugLink = document.getElementById("terug-link");
const productenLink = document.getElementById("producten-link");
const winkelsLink = document.getElementById("winkels-link");

const lijstCode = bepaalLijstCode();
terugLink.href = `index.html?lijst=${encodeURIComponent(lijstCode)}`;
productenLink.href = `producten.html?lijst=${encodeURIComponent(lijstCode)}`;
winkelsLink.href = `winkels.html?lijst=${encodeURIComponent(lijstCode)}`;

function vulCategorieSelect(select) {
  const alle = document.createElement("option");
  alle.value = "";
  alle.textContent = "Alle categorieën";
  select.appendChild(alle);
  for (const categorie of CATEGORIE_VOLGORDE) {
    const option = document.createElement("option");
    option.value = categorie;
    option.textContent = categorie;
    select.appendChild(option);
  }
}
vulCategorieSelect(maandFilter);
vulCategorieSelect(productCategorieFilter);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const geschiedenisRef = collection(db, "lijsten", lijstCode, "geschiedenis");

const DATUM_FORMAT = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const MAAND_FORMAT = new Intl.DateTimeFormat("nl-BE", {
  month: "long",
  year: "numeric",
});

const PRIJS_FORMAT = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
});

// Zonder zoekterm of filter tonen we eerst maar de bovenste producten, zodat
// je op een telefoon niet door de hele lijst hoeft te scrollen.
const STANDAARD_AANTAL_PRODUCTEN = 15;

const SORTEERDERS = {
  aantal: (a, b) => b.aantal - a.aantal || b.uitgegeven - a.uitgegeven,
  uitgegeven: (a, b) => b.uitgegeven - a.uitgegeven || b.aantal - a.aantal,
  laatst: (a, b) => b.laatsteGekocht - a.laatsteGekocht,
  naam: (a, b) => a.naam.localeCompare(b.naam, "nl"),
};

let laatsteAankopen = [];
let huidigeProducten = [];
let huidigeTab = "maand";
let toonAlleProducten = false;
const geopend = new Set();

function toonTab(naam) {
  huidigeTab = naam;
  for (const knop of tabKnoppen) {
    knop.setAttribute("aria-selected", String(knop.dataset.tab === naam));
  }
  paneelMaand.hidden = naam !== "maand";
  paneelProduct.hidden = naam !== "product";
}

for (const knop of tabKnoppen) {
  knop.addEventListener("click", () => toonTab(knop.dataset.tab));
}

maandFilter.addEventListener("change", renderMaanden);
productZoek.addEventListener("input", renderProducten);
productCategorieFilter.addEventListener("change", renderProducten);
productSorteer.addEventListener("change", renderProducten);
productMeer.addEventListener("click", () => {
  toonAlleProducten = true;
  renderProducten();
});

const geschiedenisQuery = query(geschiedenisRef, orderBy("gekocht", "desc"), limit(1000));
onSnapshot(
  geschiedenisQuery,
  (snapshot) => {
    laatsteAankopen = snapshot.docs.map((d) => d.data());
    huidigeProducten = aggregeerPerProduct(laatsteAankopen);
    render();
  },
  (error) => {
    console.error("Fout bij ontvangen van de statistieken:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

function aantalStuks(aankoop) {
  return typeof aankoop.aantal === "number" && aankoop.aantal > 0 ? aankoop.aantal : 1;
}

function aggregeerPerProduct(aankopen) {
  const perProduct = new Map();

  for (const aankoop of aankopen) {
    const sleutel = aankoop.naam.trim().toLowerCase();
    let product = perProduct.get(sleutel);
    if (!product) {
      product = {
        sleutel,
        naam: aankoop.naam,
        categorie: aankoop.categorie || "Overig",
        aantal: 0,
        uitgegeven: 0,
        laatsteGekocht: aankoop.gekocht,
        winkels: new Map(),
      };
      perProduct.set(sleutel, product);
    }

    product.aantal += 1;
    if (aankoop.gekocht > product.laatsteGekocht) {
      product.laatsteGekocht = aankoop.gekocht;
      product.categorie = aankoop.categorie || product.categorie;
    }

    if (typeof aankoop.prijs === "number") {
      product.uitgegeven += aankoop.prijs * aantalStuks(aankoop);
    }

    if (aankoop.winkel && typeof aankoop.prijs === "number") {
      const bestaandeWinkel = product.winkels.get(aankoop.winkel) || {
        totaalPrijs: 0,
        aantalMetPrijs: 0,
      };
      bestaandeWinkel.totaalPrijs += aankoop.prijs;
      bestaandeWinkel.aantalMetPrijs += 1;
      product.winkels.set(aankoop.winkel, bestaandeWinkel);
    }
  }

  return Array.from(perProduct.values()).map((product) => ({
    ...product,
    winkels: Array.from(product.winkels.entries())
      .map(([winkel, data]) => ({
        winkel,
        gemiddeldePrijs: data.totaalPrijs / data.aantalMetPrijs,
        aantalMetPrijs: data.aantalMetPrijs,
      }))
      .sort((a, b) => a.gemiddeldePrijs - b.gemiddeldePrijs),
  }));
}

// Groepeert per kalendermaand (op basis van de aankoopdatum) en telt
// prijs × aantal op, voor de "Per maand"-weergave. Aankopen zonder prijs
// tellen niet mee (er valt niets te berekenen). Met `categorieFilter`
// tellen alleen aankopen van die categorie mee.
function aggregeerPerMaand(aankopen, categorieFilter) {
  const perMaand = new Map();

  for (const aankoop of aankopen) {
    if (typeof aankoop.prijs !== "number") continue;
    if (categorieFilter && aankoop.categorie !== categorieFilter) continue;
    const sleutel = new Date(aankoop.gekocht).toISOString().slice(0, 7);
    const bestaand = perMaand.get(sleutel) || { tijd: aankoop.gekocht, totaal: 0 };
    bestaand.totaal += aankoop.prijs * aantalStuks(aankoop);
    bestaand.tijd = Math.max(bestaand.tijd, aankoop.gekocht);
    perMaand.set(sleutel, bestaand);
  }

  return Array.from(perMaand.values()).sort((a, b) => b.tijd - a.tijd);
}

function render() {
  if (laatsteAankopen.length === 0) {
    emptyState.hidden = false;
    tabsEl.hidden = true;
    paneelMaand.hidden = true;
    paneelProduct.hidden = true;
    return;
  }
  emptyState.hidden = true;
  tabsEl.hidden = false;
  toonTab(huidigeTab);
  renderMaanden();
  renderProducten();
}

function renderMaanden() {
  const maanden = aggregeerPerMaand(laatsteAankopen, maandFilter.value);
  maandLijst.innerHTML = "";
  maandLeeg.hidden = maanden.length !== 0;
  if (maanden.length === 0) return;

  const maxTotaal = Math.max(...maanden.map((m) => m.totaal));
  for (const rij of maanden) {
    maandLijst.appendChild(buildMaandRow(rij, maxTotaal));
  }
}

function renderProducten() {
  const zoekterm = productZoek.value.trim().toLowerCase();
  const categorie = productCategorieFilter.value;

  const gefilterd = huidigeProducten
    .filter((p) => !zoekterm || p.naam.toLowerCase().includes(zoekterm))
    .filter((p) => !categorie || p.categorie === categorie)
    .sort(SORTEERDERS[productSorteer.value]);

  const filterActief = Boolean(zoekterm || categorie);
  const limiet = filterActief || toonAlleProducten ? gefilterd.length : STANDAARD_AANTAL_PRODUCTEN;
  const zichtbaar = gefilterd.slice(0, limiet);

  productLijst.innerHTML = "";
  for (const product of zichtbaar) {
    productLijst.appendChild(buildProductRow(product));
  }

  productLeeg.hidden = gefilterd.length !== 0;
  productTeller.textContent =
    gefilterd.length === 0
      ? ""
      : zichtbaar.length < gefilterd.length
        ? `${zichtbaar.length} van ${gefilterd.length} producten`
        : `${gefilterd.length} producten`;

  productMeer.hidden = zichtbaar.length >= gefilterd.length;
  productMeer.textContent = `Toon alle ${gefilterd.length} producten`;
}

function buildMaandRow(rij, maxTotaal) {
  const li = document.createElement("li");
  li.className = "stats-row";

  const top = document.createElement("div");
  top.className = "stats-row__top";

  const maandEl = document.createElement("span");
  maandEl.className = "stats-row__naam";
  maandEl.textContent = MAAND_FORMAT.format(new Date(rij.tijd));

  const totaalEl = document.createElement("span");
  totaalEl.className = "stats-row__aantal";
  totaalEl.textContent = PRIJS_FORMAT.format(rij.totaal);

  top.append(maandEl, totaalEl);

  const bar = document.createElement("div");
  bar.className = "stats-row__bar";
  const barFill = document.createElement("div");
  barFill.className = "stats-row__bar-fill";
  const percentage = Math.max(6, Math.round((rij.totaal / maxTotaal) * 100));
  barFill.style.width = `${percentage}%`;
  bar.appendChild(barFill);

  li.append(top, bar);
  return li;
}

// Compacte regel (naam, categorie, aantal keer gekocht) die je openklapt voor
// de details en de prijsvergelijking per winkel.
function buildProductRow(product) {
  const li = document.createElement("li");

  const details = document.createElement("details");
  details.className = "product-stat";
  details.open = geopend.has(product.sleutel);
  details.addEventListener("toggle", () => {
    if (details.open) geopend.add(product.sleutel);
    else geopend.delete(product.sleutel);
  });

  const summary = document.createElement("summary");
  summary.className = "product-stat__summary";

  const main = document.createElement("span");
  main.className = "product-stat__main";

  const naamEl = document.createElement("span");
  naamEl.className = "product-stat__naam";
  naamEl.textContent = product.naam;

  const metaEl = document.createElement("span");
  metaEl.className = "product-stat__meta";
  metaEl.textContent =
    product.uitgegeven > 0
      ? `${product.categorie} · ${PRIJS_FORMAT.format(product.uitgegeven)} totaal`
      : product.categorie;

  main.append(naamEl, metaEl);

  const aantalEl = document.createElement("span");
  aantalEl.className = "product-stat__aantal";
  aantalEl.textContent = `${product.aantal}×`;

  summary.append(main, aantalEl);

  const body = document.createElement("div");
  body.className = "product-stat__details";

  const laatst = document.createElement("div");
  laatst.className = "stats-row__meta";
  laatst.textContent = `Laatst gekocht ${DATUM_FORMAT.format(new Date(product.laatsteGekocht))}`;
  body.appendChild(laatst);

  if (product.winkels.length > 0) {
    body.appendChild(buildWinkelVergelijking(product.winkels));
  }

  details.append(summary, body);
  li.appendChild(details);
  return li;
}

function buildWinkelVergelijking(winkels) {
  const wrapper = document.createElement("div");
  wrapper.className = "stats-row__winkels";

  winkels.forEach((winkel, index) => {
    const rij = document.createElement("div");
    rij.className = "stats-row__winkel";
    if (index === 0) rij.classList.add("stats-row__winkel--goedkoopst");

    const naam = document.createElement("span");
    naam.className = "stats-row__winkel-naam";
    naam.textContent = index === 0 && winkels.length > 1 ? `🏆 ${winkel.winkel}` : winkel.winkel;

    const prijs = document.createElement("span");
    prijs.className = "stats-row__winkel-prijs";
    const suffix = winkel.aantalMetPrijs > 1 ? " gem." : "";
    prijs.textContent = `${PRIJS_FORMAT.format(winkel.gemiddeldePrijs)}${suffix}`;

    rij.append(naam, prijs);
    wrapper.appendChild(rij);
  });

  return wrapper;
}

function updateStatus() {
  const online = navigator.onLine;
  statusIndicator.classList.toggle("is-offline", !online);
  statusLabel.textContent = online ? "Online" : "Offline";
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();
