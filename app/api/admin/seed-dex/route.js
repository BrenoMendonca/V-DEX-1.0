import { NextResponse } from "next/server";
import { getNationalDexCount, getPokemonByNameOrId } from "@/lib/pokeapi";

// Roda com concorrência limitada pra não estourar o rate limit da PokeAPI nem do Gemini.
const CONCURRENCY = 6;

function isAuthorized(request) {
  const secret = process.env.ADMIN_SEED_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

// Pré-aquece a Pokédex inteira: busca e traduz todo Pokémon que ainda não está em cache
// (ou está em cache mas sem tradução), pra que abrir qualquer um na grade da Pokédex depois
// seja instantâneo (só leitura no Mongo, sem chamada ao Gemini/PokeAPI no caminho do usuário).
// Operação longa (minutos, para os ~1025 Pokémon) — pensada pra ser chamada localmente contra
// o mesmo banco de produção, não a partir de uma função serverless com timeout curto.
export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = Math.max(1, Number(url.searchParams.get("from") ?? 1));
  const dexCount = await getNationalDexCount();
  const to = Math.min(dexCount, Number(url.searchParams.get("to") ?? dexCount));

  const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const failedIds = [];
  let succeeded = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const outcomes = await Promise.allSettled(batch.map((id) => getPokemonByNameOrId(id)));

    outcomes.forEach((outcome, index) => {
      if (outcome.status === "fulfilled" && outcome.value) {
        succeeded += 1;
      } else {
        failedIds.push(batch[index]);
      }
    });
  }

  return NextResponse.json({ from, to, total: ids.length, succeeded, failed: failedIds.length, failedIds });
}
