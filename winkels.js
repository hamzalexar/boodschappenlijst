import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { bepaalLijstCode } from "./lijst-code.js";
import { WINKELS_BELGIE } from "./winkels-belgie.js";
import { winkelsRef, instellingenRef } from "./winkel-instellingen.js";

const statusIndicator = document.getElementById("status-indicator");
const statusLabel = statusIndicator.querySelector(".status__label");
const eigenWinkelForm = document.getElementById("eigen-winkel-form");
const eigenWinkelNaamInput = document.getElementById("eigen-winkel-naam");
const eigenLijst = document.getElementById("eigen-lijst");
const eigenLeeg = document.getElementById("eigen-leeg");
const standaardLijst = document.getElementById("standaard-lijst");
const statistiekenLink = document.getElementById("statistieken-link");
const terugLink = document.getElementById("terug-link");

const lijstCode = bepaalLijstCode();
statistiekenLink.href = `statistieken.html?lijst=${encodeURIComponent(lijstCode)}`;
terugLink.href = `index.html?lijst=${encodeURIComponent(lijstCode)}`;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const instellingenDocRef = instellingenRef(db, lijstCode);
const eigenWinkelsRef = winkelsRef(db, lijstCode);

let huidigeVerborgen = [];
let huidigeEigenWinkels = [];

onSnapshot(
  instellingenDocRef,
  (snap) => {
    huidigeVerborgen = snap.exists() ? snap.data().verborgenBuiltIn || [] : [];
    renderStandaardLijst();
  },
  (error) => {
    console.error("Fout bij ontvangen van de winkelinstellingen:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

onSnapshot(
  eigenWinkelsRef,
  (snapshot) => {
    huidigeEigenWinkels = snapshot.docs.map((d) => ({ id: d.id, naam: d.data().naam }));
    renderEigenLijst();
  },
  (error) => {
    console.error("Fout bij ontvangen van eigen winkels:", error);
    statusLabel.textContent = "Verbindingsfout";
  }
);

function renderStandaardLijst() {
  standaardLijst.innerHTML = "";
  for (const naam of WINKELS_BELGIE) {
    standaardLijst.appendChild(buildStandaardRij(naam, !huidigeVerborgen.includes(naam)));
  }
}

function buildStandaardRij(naam, zichtbaar) {
  const li = document.createElement("li");
  li.className = "product-rij";

  const label = document.createElement("label");
  label.className = "winkel-toggle";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = zichtbaar;
  checkbox.addEventListener("change", () => {
    setDoc(
      instellingenDocRef,
      { verborgenBuiltIn: checkbox.checked ? arrayRemove(naam) : arrayUnion(naam) },
      { merge: true }
    ).catch((err) => console.error("Kon winkelinstelling niet opslaan:", err));
  });

  const span = document.createElement("span");
  span.textContent = naam;

  label.append(checkbox, span);
  li.appendChild(label);
  return li;
}

function renderEigenLijst() {
  eigenLijst.innerHTML = "";
  eigenLeeg.hidden = huidigeEigenWinkels.length > 0;
  for (const winkel of huidigeEigenWinkels) {
    eigenLijst.appendChild(buildEigenRij(winkel));
  }
}

function buildEigenRij(winkel) {
  const li = document.createElement("li");
  li.className = "product-rij";

  const naamEl = document.createElement("span");
  naamEl.className = "product-rij__naam";
  naamEl.textContent = winkel.naam;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "item__delete";
  deleteButton.setAttribute("aria-label", `${winkel.naam} verwijderen`);
  deleteButton.innerHTML = '<span aria-hidden="true">✕</span>';
  deleteButton.addEventListener("click", () => {
    deleteDoc(doc(eigenWinkelsRef, winkel.id)).catch((err) =>
      console.error("Kon winkel niet verwijderen:", err)
    );
  });

  li.append(naamEl, deleteButton);
  return li;
}

eigenWinkelForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const naam = eigenWinkelNaamInput.value.trim();
  if (!naam) return;

  const bestaatAl =
    WINKELS_BELGIE.some((w) => w.toLowerCase() === naam.toLowerCase()) ||
    huidigeEigenWinkels.some((w) => w.naam.toLowerCase() === naam.toLowerCase());
  if (bestaatAl) {
    eigenWinkelNaamInput.value = "";
    return;
  }

  const submitButton = eigenWinkelForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  try {
    await addDoc(eigenWinkelsRef, { naam });
    eigenWinkelNaamInput.value = "";
    eigenWinkelNaamInput.focus();
  } catch (err) {
    console.error("Kon winkel niet toevoegen:", err);
  } finally {
    submitButton.disabled = false;
  }
});

function updateStatus() {
  const online = navigator.onLine;
  statusIndicator.classList.toggle("is-offline", !online);
  statusLabel.textContent = online ? "Online" : "Offline";
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();
