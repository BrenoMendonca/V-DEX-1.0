import { translateToPortuguese } from "@/lib/gemini";
import { computeWeaknesses } from "@/lib/typeChart";

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

function normalizeQuery(query) {
  const trimmed = String(query).trim().toLowerCase();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

async function fetchFromPokeApi(query) {
  const response = await fetch(`${POKEAPI_BASE_URL}/pokemon/${query}`, {
    next: { revalidate: 86400 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`PokeAPI respondeu ${response.status} para "${query}"`);
  }

  return response.json();
}

async function fetchSpeciesFromPokeApi(nameOrId) {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/pokemon-species/${nameOrId}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function fetchAbilityDetail(name) {
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/ability/${name}`, {
      next: { revalidate: 604800 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const effect =
      pickEnglishText(data.effect_entries, "short_effect") ||
      pickEnglishText(data.effect_entries, "effect");

    return { name, effect };
  } catch {
    return null;
  }
}

function pickEnglishText(entries, field) {
  const entry = entries?.find((item) => item.language.name === "en");
  const raw = entry?.[field] ?? null;
  return raw ? raw.replace(/[\n\f\r]+/g, " ").trim() : null;
}

async function translateSafe(text, label) {
  if (!text) return null;
  try {
    return await translateToPortuguese(text);
  } catch (error) {
    console.error(`Falha ao traduzir ${label} para português:`, error.message);
    return null;
  }
}

function extractIdFromUrl(url) {
  const segments = url.split("/").filter(Boolean);
  return Number(segments[segments.length - 1]);
}

function describeEvolutionTrigger(detail) {
  if (!detail) return null;
  if (detail.min_level) return `Nv. ${detail.min_level}`;
  if (detail.item) return `Pedra: ${detail.item.name.replace(/-/g, " ")}`;
  if (detail.trigger?.name === "trade") return "Troca";
  if (detail.min_happiness) return "Felicidade alta";
  if (detail.trigger?.name === "level-up") return "Level up";
  return "Evolui";
}

function parseEvolutionChain(chainData) {
  const result = [];

  function walk(node, trigger) {
    if (!node) return;
    result.push({
      id: extractIdFromUrl(node.species.url),
      name: node.species.name,
      trigger,
    });
    for (const child of node.evolves_to ?? []) {
      walk(child, describeEvolutionTrigger(child.evolution_details?.[0]));
    }
  }

  walk(chainData?.chain, null);
  return result;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const VARIETY_SUFFIX_LABELS = {
  mega: "Mega",
  "mega-x": "Mega X",
  "mega-y": "Mega Y",
  gmax: "Gigantamax",
  alola: "Forma de Alola",
  galar: "Forma de Galar",
  hisui: "Forma de Hisui",
  paldea: "Forma de Paldea",
};

function varietySuffix(varietyName, baseSpeciesName) {
  return varietyName.startsWith(`${baseSpeciesName}-`)
    ? varietyName.slice(baseSpeciesName.length + 1)
    : varietyName;
}

function buildVarietyLabel(varietyName, baseSpeciesName) {
  const knownLabel = VARIETY_SUFFIX_LABELS[varietySuffix(varietyName, baseSpeciesName)];
  return knownLabel ? `${capitalize(baseSpeciesName)} ${knownLabel}` : capitalize(varietyName.replace(/-/g, " "));
}

// A espécie pode ter dezenas de variedades "cosméticas" (fantasias de evento do Pikachu,
// bonés de região, etc.) que não têm stats/tipo diferentes e não são o que o usuário quer
// dizer com "Mega Evolução" ou "forma regional" — só inclui a forma base + as categorias
// reconhecidas (Mega, Gigantamax, formas de Alola/Galar/Hisui/Paldea).
function parseVarieties(species) {
  return (species?.varieties ?? [])
    .filter(
      (variety) =>
        variety.is_default || VARIETY_SUFFIX_LABELS[varietySuffix(variety.pokemon.name, species.name)]
    )
    .map((variety) => ({
      id: extractIdFromUrl(variety.pokemon.url),
      name: variety.pokemon.name,
      label: buildVarietyLabel(variety.pokemon.name, species.name),
    }));
}

// Busca habilidades, cadeia de evolução, grupo de ovos e traduz descrição/categoria via Gemini.
// Função pura — não toca em nenhum banco, só PokeAPI + Gemini. Reaproveitada tanto pela versão
// completa (com cache) quanto por essa versão sem banco.
async function buildEnrichment(pokeApiId, prefetchedData) {
  const data = prefetchedData ?? (await fetchFromPokeApi(pokeApiId));
  // A espécie tem que ser buscada pelo nome/id da espécie base (ex: "charizard"), não pelo
  // pokeApiId da entrada atual — pra formas alternativas (Mega, Gigantamax, regionais), o
  // pokeApiId é um número alto (10000+) que não existe em /pokemon-species/, só em /pokemon/.
  // data.species aponta sempre pra espécie base, mesmo quando data é uma forma alternativa.
  const species = await fetchSpeciesFromPokeApi(data?.species?.name ?? pokeApiId);

  // Habilidades e cadeia de evolução só dependem de data/species (já resolvidos acima), não uma
  // da outra — buscar as duas em paralelo em vez de esperar as habilidades pra só então buscar
  // a evolução.
  const [abilitiesDetailed, evolutionChain] = await Promise.all([
    Promise.all(
      (data?.abilities ?? []).map(async (a) => {
        const detail = await fetchAbilityDetail(a.ability.name);
        return detail ?? { name: a.ability.name, effect: null };
      })
    ),
    (async () => {
      if (!species?.evolution_chain?.url) return [];
      try {
        const response = await fetch(species.evolution_chain.url, { next: { revalidate: 604800 } });
        if (!response.ok) return [];
        return parseEvolutionChain(await response.json());
      } catch (error) {
        console.error("Falha ao buscar cadeia de evolução:", error.message);
        return [];
      }
    })(),
  ]);

  const flavorText = pickEnglishText(species?.flavor_text_entries, "flavor_text");
  const genus = pickEnglishText(species?.genera, "genus");
  const [flavorTextPt, genusPt] = await Promise.all([
    translateSafe(flavorText, "descrição"),
    translateSafe(genus, "categoria"),
  ]);

  return {
    genus,
    genusPt,
    flavorText,
    flavorTextPt,
    abilitiesDetailed,
    eggGroups: species?.egg_groups?.map((g) => g.name) ?? [],
    captureRate: species?.capture_rate ?? null,
    genderRate: species?.gender_rate ?? null,
    evolutionChain,
    varieties: parseVarieties(species),
    crySound: data?.cries?.latest ?? null,
  };
}

// Versão sem banco: busca e traduz tudo ao vivo, toda vez, sem guardar nada em cache. Mais lento
// e usa mais cota do Gemini em Pokémon repetidos, aceito deliberadamente nessa variante do
// projeto pra não precisar de MongoDB.
export async function getPokemon(query) {
  const normalized = normalizeQuery(query);
  const data = await fetchFromPokeApi(normalized);
  if (!data) {
    return null;
  }

  const enrichment = await buildEnrichment(data.id, data);
  const types = data.types?.map((t) => t.type.name) ?? [];

  return {
    id: data.id,
    name: data.name,
    sprites: {
      frontDefault: data.sprites?.front_default ?? null,
      animated:
        data.sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default ?? null,
    },
    types,
    stats: data.stats?.map((s) => ({ name: s.stat.name, base: s.base_stat })) ?? [],
    height: data.height,
    weight: data.weight,
    abilities: data.abilities?.map((a) => a.ability.name) ?? [],
    ...enrichment,
    weaknesses: computeWeaknesses(types),
  };
}

function pickAllEnglishTexts(entries, field) {
  const seen = new Set();
  const result = [];
  for (const entry of entries ?? []) {
    if (entry.language.name !== "en") continue;
    const raw = entry[field];
    if (!raw) continue;
    const clean = raw.replace(/[\n\f\r]+/g, " ").trim();
    if (seen.has(clean)) continue;
    seen.add(clean);
    result.push({ version: entry.version?.name ?? null, text: clean });
  }
  return result;
}

// Busca TODAS as descrições de Pokédex em inglês (uma por jogo), pra dar mais contexto ao Gemini
// ao responder perguntas livres sobre o Pokémon em "Pergunte à Pokédex".
export async function getAllFlavorTexts(nameOrId) {
  const species = await fetchSpeciesFromPokeApi(nameOrId);
  return pickAllEnglishTexts(species?.flavor_text_entries, "flavor_text");
}
