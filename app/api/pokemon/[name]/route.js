import { NextResponse } from "next/server";
import { getPokemonByNameOrId } from "@/lib/pokeapi";

// getPokemonByNameOrId pode disparar um backfill de tradução via after() (chamada ao Gemini).
// Sem isso, a Vercel corta a função no limite padrão (curto) antes do after() terminar.
export const maxDuration = 30;

export async function GET(request, { params }) {
  const { name } = await params;

  try {
    const pokemon = await getPokemonByNameOrId(name);

    if (!pokemon) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(pokemon);
  } catch (error) {
    console.error("GET /api/pokemon/[name] failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
