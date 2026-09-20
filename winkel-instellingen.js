// Gedeeld tussen app.js en winkels.js: combineert de vaste Belgische
// winkellijst met de instellingen van deze lijst (verborgen standaard-
// winkels + zelf toegevoegde winkels) tot één set met suggesties.
import { collection, doc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { WINKELS_BELGIE } from "./winkels-belgie.js";

export function winkelsRef(db, lijstCode) {
  return collection(db, "lijsten", lijstCode, "winkels");
}

export function instellingenRef(db, lijstCode) {
  return doc(db, "lijsten", lijstCode, "instellingen", "winkels");
}

// Combineert: vaste Belgische lijst (min. de verborgen exemplaren) + zelf
// toegevoegde winkels. `verborgenBuiltIn` en `eigenWinkels` (met {naam})
// komen uit respectievelijk instellingenRef en winkelsRef.
export function combineerWinkels(verborgenBuiltIn, eigenWinkels) {
  const verborgenSet = new Set(verborgenBuiltIn || []);
  const resultaat = WINKELS_BELGIE.filter((naam) => !verborgenSet.has(naam));
  for (const winkel of eigenWinkels) {
    if (!resultaat.includes(winkel.naam)) resultaat.push(winkel.naam);
  }
  return resultaat;
}
