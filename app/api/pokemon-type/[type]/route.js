import { NextResponse } from "next/server";
import { getPokemonIdsByType } from "@/lib/pokeapi";
import { TYPE_COLORS } from "@/lib/pokemonTypes";

export async function GET(request, { params }) {
  const { type } = await params;

  if (!TYPE_COLORS[type]) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  try {
    const ids = await getPokemonIdsByType(type);
    return NextResponse.json({ ids });
  } catch (error) {
    console.error("GET /api/pokemon-type/[type] failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
