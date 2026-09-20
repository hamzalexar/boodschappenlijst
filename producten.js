import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { bepaalLijstCode } from "./lijst-code.js";
import { CATEGORIE_VOLGORDE } from "./categorieen.js";

const statusIndicator = document.getElementById("status-indicator");
const statusLabel = statusIndicator.querySelector(".status__label");
const emptyState = document.getElementById("empty-state");
const productenLijst = document.getElementById("producten-lijst");
const statistiekenLink = document.getElementById("statistieken-link");
const winkelsLink = document.getElementById("winkels-link");
const terugLink = document.getElementById("terug-link");

const lijstCode = bepaalLijstCode();
statistiekenLink.href = `statistieken.html?lijst=${encodeURIComponent(lijstCode)}`;
winkelsLink.href = `winkels.html?lijst=${encodeURIComponent(lijstCode)}`;
terugLink.href = `index.html?lijst=${encodeURIComponent(lijstCode)}`;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const geschiedenisRef = collection(db, "lijsten", lijstCode, "geschiedenis");

let laatsteAankopen = [];

const geschiedenisQuery = query(geschiedenisRef, orderBy("gekocht", "desc"), limit(1000));
onSnapshot(
  geschiedenisQuery,
  (snapshot) => {
    laatsteAankopen = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    render(laatsteAankopen);
  },
  (error) => {
    console.error("Fout bij ontvangen van de producten:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

// Groepeert op productnaam (ongeacht hoofdletters/spaties) en onthoudt de
// meest recente categorie en weergavenaam.
function aggregeerProducten(aankopen) {
  const perProduct = new Map();

  for (const aankoop of aankopen) {
    const sleutel = aankoop.naam.trim().toLowerCase();
    const bestaand = perProduct.get(sleutel);
    if (!bestaand || aankoop.gekocht > bestaand.laatsteGekocht) {
      perProduct.set(sleutel, {
        sleutel,
        naam: aankoop.naam,
        categorie: aankoop.categorie || "Overig",
        laatsteGekocht: aankoop.gekocht,
      });
    }
  }

  return Array.from(perProduct.values()).sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

function render(aankopen) {
  const producten = aggregeerProducten(aankopen);

  if (producten.length === 0) {
    emptyState.hidden = false;
    productenLijst.hidden = true;
    return;
  }
  emptyState.hidden = true;
  productenLijst.hidden = false;

  productenLijst.innerHTML = "";
  for (const product of producten) {
    productenLijst.appendChild(buildProductRow(product));
  }
}

function buildProductRow(product) {
  const li = document.createElement("li");
  li.className = "product-rij";

  const naamEl = document.createElement("span");
  naamEl.className = "product-rij__naam";
  naamEl.textContent = product.naam;

  const select = document.createElement("select");
  select.setAttribute("aria-label", `Categorie voor ${product.naam}`);
  for (const categorie of CATEGORIE_VOLGORDE) {
    const option = document.createElement("option");
    option.value = categorie;
    option.textContent = categorie;
    if (categorie === product.categorie) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener("change", () => {
    corrigeerCategorie(product.sleutel, select.value, select);
  });

  li.append(naamEl, select);
  return li;
}

// Werkt de categorie bij van alle geschiedenis-records van dit product in
// één keer (batch), zodat de statistiekenpagina meteen klopt.
async function corrigeerCategorie(productSleutel, nieuweCategorie, select) {
  const teCorrigeren = laatsteAankopen.filter(
    (a) => a.naam.trim().toLowerCase() === productSleutel && a.categorie !== nieuweCategorie
  );
  if (teCorrigeren.length === 0) return;

  select.disabled = true;
  try {
    const batch = writeBatch(db);
    for (const aankoop of teCorrigeren) {
      batch.update(doc(geschiedenisRef, aankoop.id), { categorie: nieuweCategorie });
    }
    await batch.commit();
  } catch (err) {
    console.error("Kon categorie niet corrigeren:", err);
  } finally {
    select.disabled = false;
  }
}

function updateStatus() {
  const online = navigator.onLine;
  statusIndicator.classList.toggle("is-offline", !online);
  statusLabel.textContent = online ? "Online" : "Offline";
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();
