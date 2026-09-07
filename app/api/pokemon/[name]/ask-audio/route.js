import { NextResponse } from "next/server";
import { getPokemon, getAllFlavorTexts } from "@/lib/pokeapi";
import { transcribeAudioQuestion, answerPokemonQuestion } from "@/lib/gemini";
import { isQuestionRateLimited, getClientIp, OFF_TOPIC_MESSAGE } from "@/lib/pokemonQuestions";

// Transcrição + resposta são duas chamadas ao Gemini em sequência, além do getPokemon ao vivo
// (sem cache nessa variante) — cabe mais tempo que a rota de pergunta por texto.
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

function parseAudioDataUrl(dataUrl) {
  const marker = ";base64,";
  const idx = typeof dataUrl === "string" ? dataUrl.indexOf(marker) : -1;
  if (idx === -1 || !dataUrl.startsWith("data:")) return null;

  const mimeType = dataUrl.slice(5, idx).split(";")[0];
  const data = dataUrl.slice(idx + marker.length);
  if (!mimeType.startsWith("audio/") || !data) return null;

  return { mimeType, data };
}

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

  const parsed = parseAudioDataUrl(body?.audioBase64);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
  }

  const approxBytes = (parsed.data.length * 3) / 4;
  if (approxBytes > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 400 });
  }

  try {
    const question = await transcribeAudioQuestion(parsed.data, parsed.mimeType);
    if (!question) {
      return NextResponse.json({ error: "could_not_transcribe" }, { status: 422 });
    }

    const [pokemon, flavorTexts] = await Promise.all([getPokemon(name), getAllFlavorTexts(name)]);

    if (!pokemon) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const result = await answerPokemonQuestion(
      { name: pokemon.name, types: pokemon.types, genus: pokemon.genusPt || pokemon.genus, flavorTexts },
      question
    );
    const answer = result.onTopic ? result.answer : OFF_TOPIC_MESSAGE;

    return NextResponse.json({ question, answer, onTopic: result.onTopic });
  } catch (error) {
    console.error("POST /api/pokemon/[name]/ask-audio failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
