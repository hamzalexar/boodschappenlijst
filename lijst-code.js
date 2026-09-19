// Gedeeld tussen app.js en statistieken.js: bepaalt welke lijst-code
// (en dus welk Firestore-pad) een pagina moet gebruiken.
const LOCALSTORAGE_KEY = "boodschappenlijst:lijstcode";
const LIJST_CODE_PATTERN = /^[a-zA-Z0-9]{6,64}$/;

function genereerLijstCode(lengte = 24) {
  const alfabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const willekeurigeWaarden = new Uint32Array(lengte);
  crypto.getRandomValues(willekeurigeWaarden);
  return Array.from(willekeurigeWaarden, (n) => alfabet[n % alfabet.length]).join("");
}

export function bepaalLijstCode() {
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
