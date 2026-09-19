import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const CATEGORIE_VOLGORDE = [
  "Groenten & fruit",
  "Zuivel",
  "Vlees & vis",
  "Brood",
  "Droge voeding",
  "Dranken",
  "Huishouden",
  "Overig",
];

const LOCALSTORAGE_KEY = "boodschappenlijst:lijstcode";
const LIJST_CODE_PATTERN = /^[a-zA-Z0-9]{6,64}$/;

// --- DOM-elementen ---
const addForm = document.getElementById("add-form");
const naamInput = document.getElementById("item-naam");
const hoeveelheidInput = document.getElementById("item-hoeveelheid");
const categorieSelect = document.getElementById("item-categorie");
const listContainer = document.getElementById("list-container");
const emptyState = document.getElementById("empty-state");
const counterEl = document.getElementById("counter");
const shareButton = document.getElementById("share-button");
const clearCheckedButton = document.getElementById("clear-checked-button");
const statusIndicator = document.getElementById("status-indicator");
const statusLabel = statusIndicator.querySelector(".status__label");
const categoryTemplate = document.getElementById("category-group-template");
const itemTemplate = document.getElementById("item-template");

// --- Lijst-code: bepaalt welk Firestore-pad we gebruiken ---
function genereerLijstCode(lengte = 24) {
  const alfabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const willekeurigeWaarden = new Uint32Array(lengte);
  crypto.getRandomValues(willekeurigeWaarden);
  return Array.from(willekeurigeWaarden, (n) => alfabet[n % alfabet.length]).join("");
}

function bepaalLijstCode() {
  const url = new URL(window.location.href);
  const codeUitUrl = url.searchParams.get("lijst");

  if (codeUitUrl && LIJST_CODE_PATTERN.test(codeUitUrl)) {
    localStorage.setItem(LOCALSTORAGE_KEY, codeUitUrl);
    return codeUitUrl;
  }

  const opgeslagenCode = localStorage.getItem(LOCALSTORAGE_KEY);
  if (opgeslagenCode && LIJST_CODE_PATTERN.test(opgeslagenCode)) {
    url.searchParams.set("lijst", opgeslagenCode);
    window.history.replaceState(null, "", url);
    return opgeslagenCode;
  }

  const nieuweCode = genereerLijstCode();
  localStorage.setItem(LOCALSTORAGE_KEY, nieuweCode);
  url.searchParams.set("lijst", nieuweCode);
  window.history.replaceState(null, "", url);
  return nieuweCode;
}

const lijstCode = bepaalLijstCode();

// --- Firebase / Firestore ---
const app = initializeApp(firebaseConfig);

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (err) {
  console.warn("Offline-opslag kon niet worden ingeschakeld, app werkt verder alleen online:", err);
  db = getFirestore(app);
}

const itemsRef = collection(db, "lijsten", lijstCode, "items");

let huidigeItems = [];

const itemsQuery = query(itemsRef, orderBy("aangemaakt", "asc"));
onSnapshot(
  itemsQuery,
  (snapshot) => {
    huidigeItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    render(huidigeItems);
  },
  (error) => {
    console.error("Fout bij ontvangen van de lijst:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

// --- Renderen ---
function render(items) {
  updateTeller(items);
  listContainer.innerHTML = "";

  if (items.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const categorie of CATEGORIE_VOLGORDE) {
    const itemsInCategorie = items
      .filter((item) => (item.categorie || "Overig") === categorie)
      .sort((a, b) => Number(Boolean(a.afgevinkt)) - Number(Boolean(b.afgevinkt)));

    if (itemsInCategorie.length === 0) continue;

    const groupFragment = categoryTemplate.content.cloneNode(true);
    groupFragment.querySelector(".category-group__title").textContent = categorie;
    const ul = groupFragment.querySelector(".item-list");
    for (const item of itemsInCategorie) {
      ul.appendChild(buildItemNode(item));
    }
    listContainer.appendChild(groupFragment);
  }
}

function buildItemNode(item) {
  const fragment = itemTemplate.content.cloneNode(true);
  const li = fragment.querySelector(".item");
  li.classList.toggle("is-afgevinkt", Boolean(item.afgevinkt));

  const checkbox = li.querySelector(".item__checkbox");
  checkbox.checked = Boolean(item.afgevinkt);
  checkbox.setAttribute("aria-label", `${item.naam} afvinken`);
  checkbox.addEventListener("change", () => toggleAfgevinkt(item.id, checkbox.checked));

  li.querySelector(".item__naam").textContent = item.naam;
  li.querySelector(".item__hoeveelheid").textContent = item.hoeveelheid ? `· ${item.hoeveelheid}` : "";

  const deleteButton = li.querySelector(".item__delete");
  deleteButton.setAttribute("aria-label", `${item.naam} verwijderen`);
  deleteButton.addEventListener("click", () => verwijderItem(item.id));

  return li;
}

function updateTeller(items) {
  const totaal = items.length;
  const afgevinkt = items.filter((item) => item.afgevinkt).length;
  counterEl.textContent = `${afgevinkt} van ${totaal} items afgevinkt`;
}

// --- Firestore-acties ---
function toggleAfgevinkt(id, afgevinkt) {
  updateDoc(doc(itemsRef, id), { afgevinkt }).catch((err) =>
    console.error("Kon item niet bijwerken:", err)
  );
}

function verwijderItem(id) {
  deleteDoc(doc(itemsRef, id)).catch((err) =>
    console.error("Kon item niet verwijderen:", err)
  );
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const naam = naamInput.value.trim();
  if (!naam) return;

  const hoeveelheid = hoeveelheidInput.value.trim();
  const categorie = categorieSelect.value;
  const submitButton = addForm.querySelector("button[type=submit]");

  submitButton.disabled = true;
  try {
    await addDoc(itemsRef, {
      naam,
      hoeveelheid: hoeveelheid || null,
      categorie,
      afgevinkt: false,
      aangemaakt: Date.now(),
    });
    naamInput.value = "";
    hoeveelheidInput.value = "";
    naamInput.focus();
  } catch (err) {
    console.error("Kon item niet toevoegen:", err);
  } finally {
    submitButton.disabled = false;
  }
});

clearCheckedButton.addEventListener("click", async () => {
  const teVerwijderen = huidigeItems.filter((item) => item.afgevinkt);
  if (teVerwijderen.length === 0) return;

  const batch = writeBatch(db);
  for (const item of teVerwijderen) {
    batch.delete(doc(itemsRef, item.id));
  }
  try {
    await batch.commit();
  } catch (err) {
    console.error("Kon afgevinkte items niet wissen:", err);
  }
});

// --- Delen ---
function buildShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("lijst", lijstCode);
  return url.toString();
}

function kopieerViaFallback(tekst) {
  const textarea = document.createElement("textarea");
  textarea.value = tekst;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function toonTijdelijkeTekst(button, tekst, duurMs = 1600) {
  const origineel = button.innerHTML;
  button.textContent = tekst;
  button.disabled = true;
  setTimeout(() => {
    button.innerHTML = origineel;
    button.disabled = false;
  }, duurMs);
}

shareButton.addEventListener("click", async () => {
  const url = buildShareUrl();

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Boodschappenlijst",
        text: "Doe mee met onze gedeelde boodschappenlijst",
        url,
      });
    } catch (err) {
      if (err.name !== "AbortError") console.error("Delen mislukt:", err);
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    kopieerViaFallback(url);
  }
  toonTijdelijkeTekst(shareButton, "Link gekopieerd!");
});

// --- Online/offline status ---
function updateStatus() {
  const online = navigator.onLine;
  statusIndicator.classList.toggle("is-offline", !online);
  statusLabel.textContent = online ? "Online" : "Offline · wijzigingen bewaard";
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();

// --- PWA service worker ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.warn("Service worker registratie mislukt:", err));
  });
}
