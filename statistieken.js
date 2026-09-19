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

const statusIndicator = document.getElementById("status-indicator");
const statusLabel = statusIndicator.querySelector(".status__label");
const emptyState = document.getElementById("empty-state");
const statsList = document.getElementById("stats-list");
const terugLink = document.getElementById("terug-link");

const lijstCode = bepaalLijstCode();
terugLink.href = `index.html?lijst=${encodeURIComponent(lijstCode)}`;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const geschiedenisRef = collection(db, "lijsten", lijstCode, "geschiedenis");

const DATUM_FORMAT = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const geschiedenisQuery = query(geschiedenisRef, orderBy("gekocht", "desc"), limit(1000));
onSnapshot(
  geschiedenisQuery,
  (snapshot) => {
    const aankopen = snapshot.docs.map((d) => d.data());
    render(aggregeer(aankopen));
  },
  (error) => {
    console.error("Fout bij ontvangen van de statistieken:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

function aggregeer(aankopen) {
  const perProduct = new Map();

  for (const aankoop of aankopen) {
    const sleutel = aankoop.naam.trim().toLowerCase();
    const bestaand = perProduct.get(sleutel);
    if (bestaand) {
      bestaand.aantal += 1;
      if (aankoop.gekocht > bestaand.laatsteGekocht) {
        bestaand.laatsteGekocht = aankoop.gekocht;
        bestaand.categorie = aankoop.categorie;
      }
    } else {
      perProduct.set(sleutel, {
        naam: aankoop.naam,
        categorie: aankoop.categorie || "Overig",
        aantal: 1,
        laatsteGekocht: aankoop.gekocht,
      });
    }
  }

  return Array.from(perProduct.values()).sort((a, b) => b.aantal - a.aantal);
}

function render(producten) {
  statsList.innerHTML = "";

  if (producten.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const maxAantal = producten[0].aantal;
  for (const product of producten) {
    statsList.appendChild(buildStatsRow(product, maxAantal));
  }
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
  return li;
}

function updateStatus() {
  const online = navigator.onLine;
  statusIndicator.classList.toggle("is-offline", !online);
  statusLabel.textContent = online ? "Online" : "Offline";
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();
