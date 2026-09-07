import { dbConnect } from "@/lib/mongodb";
import Pokemon from "@/models/Pokemon";
import ScanHistory from "@/models/ScanHistory";
import { getNationalDexCount } from "@/lib/pokeapi";

export function daysSince(date) {
  return Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

export async function getProfileStats(userId) {
  await dbConnect();

  if (!userId) {
    return {
      dexCount: await getNationalDexCount(),
      capturedCount: 0,
      totalScans: 0,
      identifiedScans: 0,
      notIdentifiedScans: 0,
      topTypes: [],
      recentCaptures: [],
    };
  }

  const [dexCount, capturedNames, totalScans, identifiedScans, notIdentifiedScans] = await Promise.all([
    getNationalDexCount(),
    ScanHistory.distinct("pokemonName", { status: "identified", userId }),
    ScanHistory.countDocuments({ userId }),
    ScanHistory.countDocuments({ status: "identified", userId }),
    ScanHistory.countDocuments({ status: "not_identified", userId }),
  ]);

  const capturedPokemon = await Pokemon.find(
    { name: { $in: capturedNames } },
    { pokeApiId: 1, name: 1, types: 1 }
  );

  const typeCounts = {};
  for (const p of capturedPokemon) {
    const primary = p.types?.[0];
    if (primary) {
      typeCounts[primary] = (typeCounts[primary] ?? 0) + 1;
    }
  }

  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const recentScans = await ScanHistory.find({ status: "identified", userId })
    .sort({ createdAt: -1 })
    .limit(5);

  const byName = new Map(capturedPokemon.map((p) => [p.name, p.pokeApiId]));
  const recentCaptures = recentScans.map((scan) => ({
    name: scan.pokemonName,
    id: byName.get(scan.pokemonName) ?? null,
    capturedAt: scan.createdAt.toISOString(),
  }));

  return {
    dexCount,
    capturedCount: capturedNames.length,
    totalScans,
    identifiedScans,
    notIdentifiedScans,
    topTypes,
    recentCaptures,
  };
}
