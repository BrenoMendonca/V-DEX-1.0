import { dbConnect } from "@/lib/mongodb";
import Pokemon from "@/models/Pokemon";
import ScanHistory from "@/models/ScanHistory";
import { translateToPortuguese } from "@/lib/gemini";
import { computeWeaknesses } from "@/lib/typeChart";

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

function normalizeQuery(query) {
  const trimmed = String(query).trim().toLowerCase();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

function formatPokemon(doc) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const types = plain.types ?? [];

  return {
    id: plain.pokeApiId,
    name: plain.name,
    sprites: {
      frontDefault: plain.sprites?.frontDefault ?? null,
      animated: plain.sprites?.animated ?? null,
    },
    types,
    stats: (plain.stats ?? []).map((stat) => ({ name: stat.name, base: stat.base })),
    height: plain.height,
    weight: plain.weight,
    abilities: plain.abilities ?? [],
    abilitiesDetailed: plain.abilitiesDetailed ?? [],
    genus: plain.genus ?? null,
    genusPt: plain.genusPt ?? null,
    flavorText: plain.flavorText ?? null,
    flavorTextPt: plain.flavorTextPt ?? null,
    eggGroups: plain.eggGroups ?? [],
    captureRate: plain.captureRate ?? null,
    genderRate: plain.genderRate ?? null,
    crySound: plain.crySound ?? null,
    evolutionChain: plain.evolutionChain ?? [],
    varieties: plain.varieties ?? [],
    weaknesses: computeWeaknesses(types),
  };
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
    varietiesComputedAt: new Date(),
    crySound: data?.cries?.latest ?? null,
    enrichedAt: new Date(),
  };
}

export async function getPokemonByNameOrId(query) {
  await dbConnect();

  const normalized = normalizeQuery(query);
  const filter = typeof normalized === "number" ? { pokeApiId: normalized } : { name: normalized };

  const cached = await Pokemon.findOne(filter);
  if (cached) {
    if (!cached.enrichedAt) {
      const enrichment = await buildEnrichment(cached.pokeApiId);
      Object.assign(cached, enrichment);
      await cached.save();
    } else if (
      (cached.flavorText && !cached.flavorTextPt) ||
      (cached.genus && !cached.genusPt) ||
      !cached.varietiesComputedAt
    ) {
      // A tradução pode ter falhado numa tentativa anterior (chave ausente, modelo
      // sobrecarregado etc.) mesmo com o resto do enriquecimento já concluído. Isso afeta a
      // maioria dos Pokémon já cacheados (genusPt foi adicionado depois do enriquecimento
      // inicial da dex). Espera terminar antes de responder — o usuário não quer ver inglês
      // nem precisar reabrir o Pokémon uma segunda vez pra ver a tradução aparecer.
      // O mesmo vale pra "varieties" (Mega Evolução/formas regionais), adicionado depois —
      // usa varietiesComputedAt (não "varieties.length === 0") porque o Mongoose sempre
      // devolve [] pra um array não setado, então não dava pra distinguir "nunca calculado"
      // de "calculado e sem variantes de verdade" só pelo próprio array.
      const update = {};
      if (cached.flavorText && !cached.flavorTextPt) {
        const flavorTextPt = await translateSafe(cached.flavorText, "descrição");
        if (flavorTextPt) update.flavorTextPt = flavorTextPt;
      }
      if (cached.genus && !cached.genusPt) {
        const genusPt = await translateSafe(cached.genus, "categoria");
        if (genusPt) update.genusPt = genusPt;
      }
      if (!cached.varietiesComputedAt) {
        const species = await fetchSpeciesFromPokeApi(cached.name);
        update.varieties = parseVarieties(species);
        update.varietiesComputedAt = new Date();
      }
      if (Object.keys(update).length > 0) {
        // updateOne em vez de doc.save(): o documento pode ter sido tocado por outra
        // requisição concorrente entre a leitura e aqui, e o versionamento otimista do
        // Mongoose (doc.save()) rejeitaria esse save só por causa disso — um update direto
        // por campo não corre esse risco.
        await Pokemon.updateOne({ _id: cached._id }, { $set: update });
        Object.assign(cached, update);
      }
    }
    return formatPokemon(cached);
  }

  const data = await fetchFromPokeApi(normalized);
  if (!data) {
    return null;
  }

  const enrichment = await buildEnrichment(data.id, data);

  const doc = {
    name: data.name,
    pokeApiId: data.id,
    sprites: {
      frontDefault: data.sprites?.front_default ?? null,
      animated:
        data.sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default ?? null,
    },
    types: data.types?.map((t) => t.type.name) ?? [],
    stats: data.stats?.map((s) => ({ name: s.stat.name, base: s.base_stat })) ?? [],
    height: data.height,
    weight: data.weight,
    abilities: data.abilities?.map((a) => a.ability.name) ?? [],
    raw: data,
    fetchedAt: new Date(),
    ...enrichment,
  };

  const saved = await Pokemon.findOneAndUpdate(
    { name: doc.name },
    doc,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return formatPokemon(saved);
}

export async function getCapturedIds(userId) {
  await dbConnect();

  if (!userId) {
    return [];
  }

  const capturedNames = await ScanHistory.distinct("pokemonName", { status: "identified", userId });
  if (capturedNames.length === 0) {
    return [];
  }

  const pokemons = await Pokemon.find({ name: { $in: capturedNames } }, { pokeApiId: 1 });
  return pokemons.map((p) => p.pokeApiId);
}

export async function getPokemonIdsByType(type) {
  const response = await fetch(`${POKEAPI_BASE_URL}/type/${type}`, {
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.pokemon
    .map(({ pokemon }) => extractIdFromUrl(pokemon.url))
    .filter((id) => Number.isInteger(id));
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

// Ao contrário de flavorText/flavorTextPt (só a primeira entrada em inglês, guardada no cache),
// isso busca TODAS as descrições de Pokédex em inglês (uma por jogo), pra dar mais contexto ao
// Gemini ao responder perguntas livres sobre o Pokémon.
export async function getAllFlavorTexts(nameOrId) {
  const species = await fetchSpeciesFromPokeApi(nameOrId);
  return pickAllEnglishTexts(species?.flavor_text_entries, "flavor_text");
}

export async function getNationalDexCount() {
  const response = await fetch(`${POKEAPI_BASE_URL}/pokemon-species?limit=1`, {
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    throw new Error(`PokeAPI respondeu ${response.status} ao buscar o total da Pokédex`);
  }

  const data = await response.json();
  return data.count;
}
