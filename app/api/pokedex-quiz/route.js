import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNationalDexCount, getPokemonByNameOrId } from "@/lib/pokeapi";
import { eggGroupLabel } from "@/lib/eggGroups";

// getPokemonByNameOrId pode disparar enriquecimento (Gemini) em Pokémon nunca vistos.
export const maxDuration = 30;

function randomId(dexCount) {
  return Math.floor(Math.random() * dexCount) + 1;
}

function pickUniqueIds(dexCount, count) {
  const ids = new Set();
  while (ids.size < count) {
    ids.add(randomId(dexCount));
  }
  return [...ids];
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function buildComparisonQuestion(dexCount, field, questionText) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [idA, idB] = pickUniqueIds(dexCount, 2);
    const [a, b] = await Promise.all([getPokemonByNameOrId(idA), getPokemonByNameOrId(idB)]);
    if (!a || !b || a[field] === b[field]) continue;

    return {
      type: field,
      question: questionText,
      options: shuffle([
        { id: a.id, name: a.name, value: a[field], isCorrect: a[field] > b[field] },
        { id: b.id, name: b.name, value: b[field], isCorrect: b[field] > a[field] },
      ]),
    };
  }
  return null;
}

async function buildGenusQuestion(dexCount) {
  const ids = pickUniqueIds(dexCount, 4);
  const [target, ...decoys] = await Promise.all(ids.map((id) => getPokemonByNameOrId(id)));
  if (!target) return null;

  const correctText = target.genusPt || target.genus;
  if (!correctText) return null;

  const decoyTexts = [];
  for (const decoy of decoys) {
    const text = decoy?.genusPt || decoy?.genus;
    if (text && text !== correctText && !decoyTexts.includes(text)) decoyTexts.push(text);
  }
  if (decoyTexts.length < 3) return null;

  return {
    type: "genus",
    question: `Qual é a categoria de ${target.name.replace(/-/g, " ")}?`,
    targetId: target.id,
    targetName: target.name,
    options: shuffle([
      { text: correctText, isCorrect: true },
      ...decoyTexts.slice(0, 3).map((text) => ({ text, isCorrect: false })),
    ]),
  };
}

async function buildEggGroupQuestion(dexCount) {
  const ids = pickUniqueIds(dexCount, 4);
  const [target, ...decoys] = await Promise.all(ids.map((id) => getPokemonByNameOrId(id)));
  if (!target) return null;

  const correctText = target.eggGroups?.length ? target.eggGroups.map(eggGroupLabel).join(", ") : null;
  if (!correctText) return null;

  const decoyTexts = [];
  for (const decoy of decoys) {
    const text = decoy?.eggGroups?.length ? decoy.eggGroups.map(eggGroupLabel).join(", ") : null;
    if (text && text !== correctText && !decoyTexts.includes(text)) decoyTexts.push(text);
  }
  if (decoyTexts.length < 3) return null;

  return {
    type: "eggGroup",
    question: `Qual é o grupo de ovos de ${target.name.replace(/-/g, " ")}?`,
    targetId: target.id,
    targetName: target.name,
    options: shuffle([
      { text: correctText, isCorrect: true },
      ...decoyTexts.slice(0, 3).map((text) => ({ text, isCorrect: false })),
    ]),
  };
}

const QUESTION_BUILDERS = [
  (dexCount) => buildComparisonQuestion(dexCount, "weight", "Qual desses Pokémon pesa mais?"),
  (dexCount) => buildComparisonQuestion(dexCount, "height", "Qual desses Pokémon é mais alto?"),
  buildGenusQuestion,
  buildEggGroupQuestion,
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const dexCount = await getNationalDexCount();

    for (let attempt = 0; attempt < 5; attempt++) {
      const builder = QUESTION_BUILDERS[Math.floor(Math.random() * QUESTION_BUILDERS.length)];
      const question = await builder(dexCount);
      if (question) {
        return NextResponse.json(question);
      }
    }

    return NextResponse.json({ error: "could_not_build_question" }, { status: 500 });
  } catch (error) {
    console.error("GET /api/pokedex-quiz failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
