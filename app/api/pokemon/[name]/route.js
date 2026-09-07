import { NextResponse } from "next/server";
import { getPokemon } from "@/lib/pokeapi";

// Sem cache nessa variante sem banco: sempre busca e traduz ao vivo, pode levar alguns segundos.
export const maxDuration = 30;

export async function GET(request, { params }) {
  const { name } = await params;

  try {
    const pokemon = await getPokemon(name);

    if (!pokemon) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(pokemon);
  } catch (error) {
    console.error("GET /api/pokemon/[name] failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
