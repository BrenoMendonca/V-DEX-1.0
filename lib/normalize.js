const NAME_OVERRIDES = {
  nidoran: "nidoran-f",
  "mr mime": "mr-mime",
  "mime jr": "mime-jr",
  "ho oh": "ho-oh",
  "porygon z": "porygon-z",
  "type null": "type-null",
  "jangmo o": "jangmo-o",
  "hakamo o": "hakamo-o",
  "kommo o": "kommo-o",
};

// A PokeAPI nomeia formas alternativas como "base-sufixo" (ex: "charizard-mega-x",
// "raichu-alola"), mas o Gemini tende a descrever a carta como "mega charizard x" ou
// "alolan raichu" (prefixo em inglês, como aparece nas cartas). Esses padrões reescrevem
// pro formato que a PokeAPI espera antes da normalização genérica de espaços/hífens.
const FORM_PATTERNS = [
  { regex: /^mega\s+(.+?)\s+([xy])$/i, suffix: (letter) => `mega-${letter.toLowerCase()}` },
  { regex: /^mega\s+(.+)$/i, suffix: () => "mega" },
  { regex: /^(?:gigantamax|dynamax)\s+(.+)$/i, suffix: () => "gmax" },
  { regex: /^alolan\s+(.+)$/i, suffix: () => "alola" },
  { regex: /^galarian\s+(.+)$/i, suffix: () => "galar" },
  { regex: /^hisuian\s+(.+)$/i, suffix: () => "hisui" },
  { regex: /^paldean\s+(.+)$/i, suffix: () => "paldea" },
];

const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

function slugify(text) {
  return text.replace(/['.]/g, "").trim().replace(/\s+/g, "-");
}

export function normalizePokemonName(name) {
  const cleaned = String(name)
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .trim()
    .toLowerCase();

  if (NAME_OVERRIDES[cleaned]) {
    return NAME_OVERRIDES[cleaned];
  }

  for (const { regex, suffix } of FORM_PATTERNS) {
    const match = cleaned.match(regex);
    if (match) {
      const base = slugify(match[1]);
      return `${base}-${suffix(match[2])}`;
    }
  }

  return slugify(cleaned);
}
