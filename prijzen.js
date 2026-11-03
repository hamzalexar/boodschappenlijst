// Gedeeld tussen app.js (melding bij het afvinken) en statistieken.js:
// de prijsontwikkeling van één product per winkel.
//
// Per winkel en per kalenderdag nemen we het met het aantal gewogen gemiddelde
// van de prijs per stuk. Zo gelden meerdere regels van dezelfde bon (bijv. twee
// soorten snoepgroente) niet als een "prijsverandering". Het resultaat is per
// winkel een lijst van oud naar nieuw; het laatste element is de actuele prijs.
export function prijsverloopPerWinkel(aankopen) {
  const perWinkel = new Map();

  for (const aankoop of aankopen) {
    if (!aankoop.winkel || typeof aankoop.prijs !== "number") continue;
    const aantal = typeof aankoop.aantal === "number" && aankoop.aantal > 0 ? aankoop.aantal : 1;
    const dag = new Date(aankoop.gekocht).toISOString().slice(0, 10);

    const dagen = perWinkel.get(aankoop.winkel) || new Map();
    const punt = dagen.get(dag) || { tijd: aankoop.gekocht, som: 0, stuks: 0 };
    punt.som += aankoop.prijs * aantal;
    punt.stuks += aantal;
    punt.tijd = Math.max(punt.tijd, aankoop.gekocht);
    dagen.set(dag, punt);
    perWinkel.set(aankoop.winkel, dagen);
  }

  return new Map(
    Array.from(perWinkel.entries()).map(([winkel, dagen]) => [
      winkel,
      Array.from(dagen.values())
        .map((punt) => ({ tijd: punt.tijd, prijs: punt.som / punt.stuks }))
        .sort((a, b) => a.tijd - b.tijd),
    ])
  );
}
