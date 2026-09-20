// Eenvoudige woordenlijst om bij het typen van een productnaam automatisch
// een categorie voor te stellen. Herkenning gebeurt op hele woorden (dus
// "melk" matcht, maar "melkchocolade" niet per ongeluk als Zuivel).
//
// Wil je een product toevoegen? Zet de naam in kleine letters, zonder
// apostrof, als sleutel hieronder bij de juiste categorie.
const PRODUCT_CATEGORIEEN = {
  // Groenten & fruit
  appel: "Groenten & fruit",
  appels: "Groenten & fruit",
  banaan: "Groenten & fruit",
  bananen: "Groenten & fruit",
  peer: "Groenten & fruit",
  peren: "Groenten & fruit",
  sinaasappel: "Groenten & fruit",
  sinaasappels: "Groenten & fruit",
  mandarijn: "Groenten & fruit",
  mandarijnen: "Groenten & fruit",
  druiven: "Groenten & fruit",
  aardbeien: "Groenten & fruit",
  tomaat: "Groenten & fruit",
  tomaten: "Groenten & fruit",
  komkommer: "Groenten & fruit",
  komkommers: "Groenten & fruit",
  sla: "Groenten & fruit",
  ui: "Groenten & fruit",
  uien: "Groenten & fruit",
  aardappel: "Groenten & fruit",
  aardappelen: "Groenten & fruit",
  wortel: "Groenten & fruit",
  wortelen: "Groenten & fruit",
  paprika: "Groenten & fruit",
  paprikas: "Groenten & fruit",
  courgette: "Groenten & fruit",
  broccoli: "Groenten & fruit",
  bloemkool: "Groenten & fruit",
  spinazie: "Groenten & fruit",
  champignons: "Groenten & fruit",
  avocado: "Groenten & fruit",
  avocados: "Groenten & fruit",
  citroen: "Groenten & fruit",
  citroenen: "Groenten & fruit",
  limoen: "Groenten & fruit",
  knoflook: "Groenten & fruit",

  // Zuivel
  melk: "Zuivel",
  karnemelk: "Zuivel",
  yoghurt: "Zuivel",
  kwark: "Zuivel",
  kaas: "Zuivel",
  roomboter: "Zuivel",
  boter: "Zuivel",
  room: "Zuivel",
  slagroom: "Zuivel",
  vla: "Zuivel",
  mozzarella: "Zuivel",
  feta: "Zuivel",
  ei: "Zuivel",
  eieren: "Zuivel",

  // Vlees & vis
  kipfilet: "Vlees & vis",
  kip: "Vlees & vis",
  gehakt: "Vlees & vis",
  worst: "Vlees & vis",
  bacon: "Vlees & vis",
  spek: "Vlees & vis",
  ham: "Vlees & vis",
  zalm: "Vlees & vis",
  tonijn: "Vlees & vis",
  vis: "Vlees & vis",
  kabeljauw: "Vlees & vis",
  garnalen: "Vlees & vis",
  hamburgers: "Vlees & vis",
  schnitzel: "Vlees & vis",

  // Brood
  brood: "Brood",
  stokbrood: "Brood",
  volkorenbrood: "Brood",
  witbrood: "Brood",
  croissant: "Brood",
  croissants: "Brood",
  beschuit: "Brood",
  crackers: "Brood",
  broodjes: "Brood",

  // Droge voeding
  pasta: "Droge voeding",
  spaghetti: "Droge voeding",
  rijst: "Droge voeding",
  macaroni: "Droge voeding",
  bloem: "Droge voeding",
  suiker: "Droge voeding",
  zout: "Droge voeding",
  peper: "Droge voeding",
  olie: "Droge voeding",
  olijfolie: "Droge voeding",
  azijn: "Droge voeding",
  ketchup: "Droge voeding",
  mayonaise: "Droge voeding",
  mosterd: "Droge voeding",
  pindakaas: "Droge voeding",
  jam: "Droge voeding",
  honing: "Droge voeding",
  muesli: "Droge voeding",
  cornflakes: "Droge voeding",
  havermout: "Droge voeding",
  koekjes: "Droge voeding",
  chips: "Droge voeding",
  noten: "Droge voeding",
  chocolade: "Droge voeding",
  soep: "Droge voeding",
  bouillon: "Droge voeding",
  couscous: "Droge voeding",
  linzen: "Droge voeding",
  bonen: "Droge voeding",

  // Dranken
  water: "Dranken",
  cola: "Dranken",
  sinaasappelsap: "Dranken",
  appelsap: "Dranken",
  sap: "Dranken",
  koffie: "Dranken",
  thee: "Dranken",
  bier: "Dranken",
  wijn: "Dranken",
  frisdrank: "Dranken",
  limonade: "Dranken",

  // Huishouden
  "wc-papier": "Huishouden",
  wcpapier: "Huishouden",
  keukenpapier: "Huishouden",
  afwasmiddel: "Huishouden",
  wasmiddel: "Huishouden",
  wasverzachter: "Huishouden",
  vuilniszakken: "Huishouden",
  tandpasta: "Huishouden",
  shampoo: "Huishouden",
  zeep: "Huishouden",
  allesreiniger: "Huishouden",
  sponsjes: "Huishouden",
  folie: "Huishouden",
  aluminiumfolie: "Huishouden",
  luiers: "Huishouden",
};

// Zoekt op basis van hele woorden in de getypte naam (case-insensitive,
// zonder apostrofs) naar een bekende categorie. Geeft null als er geen
// match is, zodat de huidige selectie dan ongemoeid blijft.
export function herkenCategorie(naam) {
  const woorden = naam
    .toLowerCase()
    .replace(/['']/g, "")
    .split(/\s+/)
    .filter(Boolean);

  for (const woord of woorden) {
    const categorie = PRODUCT_CATEGORIEEN[woord];
    if (categorie) return categorie;
  }
  return null;
}
