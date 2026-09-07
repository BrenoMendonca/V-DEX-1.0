import { NextResponse } from "next/server";
import { getPokemon, getAllFlavorTexts } from "@/lib/pokeapi";
import { answerPokemonQuestion } from "@/lib/gemini";
import { isQuestionRateLimited, getClientIp, OFF_TOPIC_MESSAGE } from "@/lib/pokemonQuestions";

// getPokemon busca e traduz ao vivo (sem cache nessa variante), além da própria chamada de
// resposta da pergunta.
export const maxDuration = 30;

const MAX_QUESTION_LENGTH = 200;

export async function POST(request, { params }) {
  if (isQuestionRateLimited(getClientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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

  try {
    const [pokemon, flavorTexts] = await Promise.all([getPokemon(name), getAllFlavorTexts(name)]);

    if (!pokemon) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const result = await answerPokemonQuestion(
      { name: pokemon.name, types: pokemon.types, genus: pokemon.genusPt || pokemon.genus, flavorTexts },
      question
    );
    const answer = result.onTopic ? result.answer : OFF_TOPIC_MESSAGE;

    return NextResponse.json({ answer, onTopic: result.onTopic });
  } catch (error) {
    console.error("POST /api/pokemon/[name]/ask failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
