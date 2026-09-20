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
const maandSectie = document.getElementById("maand-sectie");
const maandLijst = document.getElementById("maand-lijst");
const maandLeeg = document.getElementById("maand-leeg");
const maandFilter = document.getElementById("maand-categorie-filter");
const productSectie = document.getElementById("product-sectie");
const statsList = document.getElementById("stats-list");
const terugLink = document.getElementById("terug-link");
const productenLink = document.getElementById("producten-link");
const winkelsLink = document.getElementById("winkels-link");

const lijstCode = bepaalLijstCode();
terugLink.href = `index.html?lijst=${encodeURIComponent(lijstCode)}`;
productenLink.href = `producten.html?lijst=${encodeURIComponent(lijstCode)}`;
winkelsLink.href = `winkels.html?lijst=${encodeURIComponent(lijstCode)}`;

const alleCategorieenOptie = document.createElement("option");
alleCategorieenOptie.value = "";
alleCategorieenOptie.textContent = "Alle categorieën";
maandFilter.appendChild(alleCategorieenOptie);
for (const categorie of CATEGORIE_VOLGORDE) {
  const option = document.createElement("option");
  option.value = categorie;
  option.textContent = categorie;
  maandFilter.appendChild(option);
}

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

let laatsteAankopen = [];
maandFilter.addEventListener("change", () => render(laatsteAankopen));

const geschiedenisQuery = query(geschiedenisRef, orderBy("gekocht", "desc"), limit(1000));
onSnapshot(
  geschiedenisQuery,
  (snapshot) => {
    laatsteAankopen = snapshot.docs.map((d) => d.data());
    render(laatsteAankopen);
  },
  (error) => {
    console.error("Fout bij ontvangen van de statistieken:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

function aggregeerPerProduct(aankopen) {
  const perProduct = new Map();

  for (const aankoop of aankopen) {
    const sleutel = aankoop.naam.trim().toLowerCase();
    let product = perProduct.get(sleutel);
    if (!product) {
      product = {
        naam: aankoop.naam,
        categorie: aankoop.categorie || "Overig",
        aantal: 0,
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

  return Array.from(perProduct.values())
    .map((product) => ({
      ...product,
      winkels: Array.from(product.winkels.entries())
        .map(([winkel, data]) => ({
          winkel,
          gemiddeldePrijs: data.totaalPrijs / data.aantalMetPrijs,
          aantalMetPrijs: data.aantalMetPrijs,
        }))
        .sort((a, b) => a.gemiddeldePrijs - b.gemiddeldePrijs),
    }))
    .sort((a, b) => b.aantal - a.aantal);
}

// Groepeert per kalendermaand (op basis van de aankoopdatum) en telt
// prijs × aantal op, voor de "Uitgaven per maand"-grafiek. Aankopen zonder
// prijs tellen niet mee (er valt niets te berekenen). Met `categorieFilter`
// tellen alleen aankopen van die categorie mee.
function aggregeerPerMaand(aankopen, categorieFilter) {
  const perMaand = new Map();

  for (const aankoop of aankopen) {
    if (typeof aankoop.prijs !== "number") continue;
    if (categorieFilter && aankoop.categorie !== categorieFilter) continue;
    const aantal = typeof aankoop.aantal === "number" && aankoop.aantal > 0 ? aankoop.aantal : 1;
    const sleutel = new Date(aankoop.gekocht).toISOString().slice(0, 7);
    const bestaand = perMaand.get(sleutel) || { tijd: aankoop.gekocht, totaal: 0 };
    bestaand.totaal += aankoop.prijs * aantal;
    bestaand.tijd = Math.max(bestaand.tijd, aankoop.gekocht);
    perMaand.set(sleutel, bestaand);
  }

  return Array.from(perMaand.values()).sort((a, b) => b.tijd - a.tijd);
}

function render(aankopen) {
  if (aankopen.length === 0) {
    emptyState.hidden = false;
    maandSectie.hidden = true;
    productSectie.hidden = true;
    return;
  }
  emptyState.hidden = true;

  const maanden = aggregeerPerMaand(aankopen, maandFilter.value);
  maandLijst.innerHTML = "";
  maandSectie.hidden = false;
  maandLeeg.hidden = maanden.length !== 0;
  if (maanden.length > 0) {
    const maxTotaal = Math.max(...maanden.map((m) => m.totaal));
    for (const rij of maanden) {
      maandLijst.appendChild(buildMaandRow(rij, maxTotaal));
    }
  }

  const producten = aggregeerPerProduct(aankopen);
  statsList.innerHTML = "";
  productSectie.hidden = producten.length === 0;
  if (producten.length > 0) {
    const maxAantal = producten[0].aantal;
    for (const product of producten) {
      statsList.appendChild(buildStatsRow(product, maxAantal));
    }
  }
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

function buildStatsRow(product, maxAantal) {
  const li = document.createElement("li");
  li.className = "stats-row";

  const top = document.createElement("div");
  top.className = "stats-row__top";

  const naamEl = document.createElement("span");
  naamEl.className = "stats-row__naam";
  naamEl.textContent = product.naam;

  const aantalEl = document.createElement("span");
  aantalEl.className = "stats-row__aantal";
  aantalEl.textContent = `${product.aantal}×`;

  top.append(naamEl, aantalEl);

  const bar = document.createElement("div");
  bar.className = "stats-row__bar";
  const barFill = document.createElement("div");
  barFill.className = "stats-row__bar-fill";
  const percentage = Math.max(6, Math.round((product.aantal / maxAantal) * 100));
  barFill.style.width = `${percentage}%`;
  bar.appendChild(barFill);

  const meta = document.createElement("div");
  meta.className = "stats-row__meta";
  meta.textContent = `${product.categorie} · laatst gekocht ${DATUM_FORMAT.format(new Date(product.laatsteGekocht))}`;

  li.append(top, bar, meta);

  if (product.winkels.length > 0) {
    li.appendChild(buildWinkelVergelijking(product.winkels));
  }

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
    naam.textContent = index === 0 ? `🏆 ${winkel.winkel}` : winkel.winkel;

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
