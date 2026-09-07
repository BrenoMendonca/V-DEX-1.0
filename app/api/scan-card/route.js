import { NextResponse } from "next/server";
import { identifyPokemonFromImage, CONFIDENCE_THRESHOLD } from "@/lib/gemini";
import { getPokemon } from "@/lib/pokeapi";
import { normalizePokemonName } from "@/lib/normalize";

// Identificação + fallback pra modelo mais forte + enriquecimento (sem cache, sempre ao vivo
// nessa variante sem banco) podem somar bastante tempo no pior caso.
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function parseDataUrl(imageBase64) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(imageBase64);
  if (!match) {
    return null;
  }
  return { mimeType: match[1], data: match[2] };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", error: "invalid_json" }, { status: 400 });
  }

  const { imageBase64 } = body ?? {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ status: "error", error: "missing_image" }, { status: 400 });
  }

  const parsed = parseDataUrl(imageBase64);
  if (!parsed || !ALLOWED_MIME_TYPES.includes(parsed.mimeType)) {
    return NextResponse.json({ status: "error", error: "invalid_image_format" }, { status: 400 });
  }

  const approxBytes = (parsed.data.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ status: "error", error: "image_too_large" }, { status: 400 });
  }

  try {
    const identification = await identifyPokemonFromImage(parsed.data, parsed.mimeType);

    if (!identification.identified || identification.confidence < CONFIDENCE_THRESHOLD) {
      return NextResponse.json({ status: "not_identified" });
    }

    const normalizedName = normalizePokemonName(identification.pokemonName);
    const pokemon = await getPokemon(normalizedName);

    if (!pokemon) {
      return NextResponse.json({ status: "not_identified" });
    }

    return NextResponse.json({ status: "identified", confidence: identification.confidence, pokemon });
  } catch (error) {
    console.error("POST /api/scan-card failed:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
