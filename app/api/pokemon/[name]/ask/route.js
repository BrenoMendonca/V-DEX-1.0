import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { getPokemonByNameOrId, getAllFlavorTexts } from "@/lib/pokeapi";
import { answerPokemonQuestion } from "@/lib/gemini";
import {
  isQuestionRateLimited,
  logPokemonQuestion,
  QUESTION_RATE_LIMIT_WINDOW_MS,
  OFF_TOPIC_MESSAGE,
} from "@/lib/pokemonQuestions";

// getPokemonByNameOrId pode disparar enriquecimento (Gemini) em Pokémon nunca vistos, além da
// própria chamada de resposta da pergunta.
export const maxDuration = 30;

const MAX_QUESTION_LENGTH = 200;

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const question = String(body?.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "missing_question" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "question_too_long" }, { status: 400 });
  }

  await dbConnect();

  if (await isQuestionRateLimited(session.user.id)) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: QUESTION_RATE_LIMIT_WINDOW_MS },
      { status: 429 }
    );
  }

  try {
    const [pokemon, flavorTexts] = await Promise.all([
      getPokemonByNameOrId(name),
      getAllFlavorTexts(name),
    ]);

    if (!pokemon) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const result = await answerPokemonQuestion(
      { name: pokemon.name, types: pokemon.types, genus: pokemon.genusPt || pokemon.genus, flavorTexts },
      question
    );
    const answer = result.onTopic ? result.answer : OFF_TOPIC_MESSAGE;

    logPokemonQuestion({
      userId: session.user.id,
      pokemonName: pokemon.name,
      question,
      answer,
      onTopic: result.onTopic,
    });

    return NextResponse.json({ answer, onTopic: result.onTopic });
  } catch (error) {
    console.error("POST /api/pokemon/[name]/ask failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
