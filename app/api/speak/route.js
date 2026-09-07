import { NextResponse } from "next/server";
import { synthesizeSpeechFish } from "@/lib/fish";
import { synthesizeSpeech as synthesizeSpeechGemini } from "@/lib/gemini";
import { pcmToWav } from "@/lib/wav";

const MAX_TEXT_LENGTH = 1000;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { text } = body ?? {};
  if (!text || typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });
  }

  // Fish Audio é a voz padrão da Pokédex (mais natural) — sempre tentada primeiro. Só cai pro
  // Gemini TTS abaixo se o Fish Audio falhar (chave não configurada, erro de API, etc.). Não
  // inverter essa ordem: o Gemini é reserva, não a voz principal.
  try {
    const mp3 = await synthesizeSpeechFish(text);
    return new NextResponse(mp3, { headers: { "Content-Type": "audio/mpeg" } });
  } catch (fishError) {
    console.error("Fish Audio TTS falhou, tentando Gemini:", fishError.message);
  }

  try {
    const pcm = await synthesizeSpeechGemini(text);
    const wav = pcmToWav(pcm);
    return new NextResponse(wav, { headers: { "Content-Type": "audio/wav" } });
  } catch (error) {
    console.error("POST /api/speak failed (Gemini fallback também falhou):", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
