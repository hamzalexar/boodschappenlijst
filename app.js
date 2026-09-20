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
  limit,
  getDocs,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { bepaalLijstCode } from "./lijst-code.js";
import { herkenCategorie } from "./product-categorieen.js";

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
const statsLink = document.getElementById("stats-link");
const winkelDatalist = document.getElementById("winkel-suggesties");

// --- Automatische categorie-herkenning bij het toevoegen ---
// Zolang de gebruiker de categorie niet zelf heeft aangepast, mag het
// typen van een herkende productnaam de keuze automatisch invullen. Zodra
// iemand zelf een categorie kiest, laten we die staan (ook als daarna nog
// verder wordt getypt in het naam-veld).
let categorieWerdHandmatigGewijzigd = false;

categorieSelect.addEventListener("change", () => {
  categorieWerdHandmatigGewijzigd = true;
});

naamInput.addEventListener("input", () => {
  if (categorieWerdHandmatigGewijzigd) return;
  const categorie = herkenCategorie(naamInput.value);
  if (categorie) {
    categorieSelect.value = categorie;
  }
});

const lijstCode = bepaalLijstCode();
if (statsLink) {
  statsLink.href = `statistieken.html?lijst=${encodeURIComponent(lijstCode)}`;
}

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
const geschiedenisRef = collection(db, "lijsten", lijstCode, "geschiedenis");

// Vult de datalist met winkels die eerder zijn ingevuld, als hulp bij het
// invullen (niet verplicht: vrije tekst blijft mogelijk).
getDocs(query(geschiedenisRef, orderBy("gekocht", "desc"), limit(200)))
  .then((snapshot) => {
    const winkels = new Set();
    snapshot.forEach((d) => {
      const winkel = d.data().winkel;
      if (winkel) winkels.add(winkel);
    });
    for (const winkel of winkels) {
      const option = document.createElement("option");
      option.value = winkel;
      winkelDatalist.appendChild(option);
    }
  })
  .catch((err) => console.warn("Kon winkel-suggesties niet laden:", err));

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
// De lijst wordt bij elke Firestore-update volledig opnieuw opgebouwd. Omdat
// het invullen van prijs/winkel zelf ook een update veroorzaakt (bij het
// verlaten van het prijsveld), zou de focus anders midden in het invullen
// verspringen. Daarom onthouden we welk veld actief was en zetten de focus
// (en cursorpositie) terug na het herbouwen.
function render(items) {
  const focusInfo = bewaarFocus();

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

  herstelFocus(focusInfo);
}

function bewaarFocus() {
  const actief = document.activeElement;
  if (!actief || !listContainer.contains(actief) || !actief.dataset.itemId) return null;
  return {
    itemId: actief.dataset.itemId,
    veld: actief.classList.contains("item__prijs-input") ? "prijs" : "winkel",
    waarde: actief.value,
    selectionStart: actief.selectionStart,
    selectionEnd: actief.selectionEnd,
  };
}

function herstelFocus(focusInfo) {
  if (!focusInfo) return;
  const selector = `.item__${focusInfo.veld}-input[data-item-id="${CSS.escape(focusInfo.itemId)}"]`;
  const nieuwElement = listContainer.querySelector(selector);
  if (!nieuwElement) return;
  // Niet-opgeslagen tekst die nog in dit veld stond (bijv. terwijl de
  // update van het andere veld net binnenkwam) blijft staan in plaats van
  // te worden overschreven door de waarde uit Firestore.
  nieuwElement.value = focusInfo.waarde;
  nieuwElement.focus();
  if (typeof focusInfo.selectionStart === "number") {
    nieuwElement.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
  }
}

function buildItemNode(item) {
  const fragment = itemTemplate.content.cloneNode(true);
  const li = fragment.querySelector(".item");
  li.classList.toggle("is-afgevinkt", Boolean(item.afgevinkt));

  const checkbox = li.querySelector(".item__checkbox");
  checkbox.checked = Boolean(item.afgevinkt);
  checkbox.setAttribute("aria-label", `${item.naam} afvinken`);
  checkbox.addEventListener("change", () => toggleAfgevinkt(item, checkbox.checked));

  li.querySelector(".item__naam").textContent = item.naam;
  li.querySelector(".item__hoeveelheid").textContent = item.hoeveelheid ? `· ${item.hoeveelheid}` : "";

  const deleteButton = li.querySelector(".item__delete");
  deleteButton.setAttribute("aria-label", `${item.naam} verwijderen`);
  deleteButton.addEventListener("click", () => verwijderItem(item));

  const prijsRij = li.querySelector(".item__prijs-rij");
  const prijsInput = li.querySelector(".item__prijs-input");
  const winkelInput = li.querySelector(".item__winkel-input");
  prijsRij.hidden = !item.afgevinkt;
  prijsInput.value = item.prijs != null ? item.prijs : "";
  winkelInput.value = item.winkel || "";
  prijsInput.dataset.itemId = item.id;
  winkelInput.dataset.itemId = item.id;

  prijsInput.addEventListener("blur", () => {
    const ruw = prijsInput.value.trim().replace(",", ".");
    const prijs = ruw === "" ? null : Math.round(parseFloat(ruw) * 100) / 100;
    updateDoc(doc(itemsRef, item.id), { prijs: Number.isFinite(prijs) ? prijs : null }).catch(
      (err) => console.error("Kon prijs niet opslaan:", err)
    );
  });

  winkelInput.addEventListener("blur", () => {
    updateDoc(doc(itemsRef, item.id), { winkel: winkelInput.value.trim() || null }).catch((err) =>
      console.error("Kon winkel niet opslaan:", err)
    );
  });

  return li;
}

function updateTeller(items) {
  const totaal = items.length;
  const afgevinkt = items.filter((item) => item.afgevinkt).length;
  counterEl.textContent = `${afgevinkt} van ${totaal} items afgevinkt`;
}

// --- Firestore-acties ---
function toggleAfgevinkt(item, afgevinkt) {
  updateDoc(doc(itemsRef, item.id), { afgevinkt }).catch((err) =>
    console.error("Kon item niet bijwerken:", err)
  );
}

// Bouwt het geschiedenis-record dat bewaard blijft nadat een afgevinkt item
// wordt verwijderd (prijs/winkel zijn optioneel en kunnen leeg zijn).
function bouwGeschiedenisRecord(item) {
  return {
    naam: item.naam,
    categorie: item.categorie || "Overig",
    hoeveelheid: item.hoeveelheid || null,
    prijs: typeof item.prijs === "number" ? item.prijs : null,
    winkel: item.winkel || null,
    gekocht: Date.now(),
  };
}

async function verwijderItem(item) {
  try {
    // Alleen loggen als het item was afgevinkt (= daadwerkelijk gekocht).
    if (item.afgevinkt) {
      await addDoc(geschiedenisRef, bouwGeschiedenisRecord(item));
    }
    await deleteDoc(doc(itemsRef, item.id));
  } catch (err) {
    console.error("Kon item niet verwijderen:", err);
  }
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
    categorieSelect.value = "";
    categorieWerdHandmatigGewijzigd = false;
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
    batch.set(doc(geschiedenisRef), bouwGeschiedenisRecord(item));
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
