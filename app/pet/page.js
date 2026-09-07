import { auth } from "@/auth";
import AuthForm from "@/components/AuthForm";
import PetView from "@/components/PetView";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import VirtualPet from "@/models/VirtualPet";
import { POKEMON_LIST } from "@/lib/pokemonList";
import { applyDecay, getLevel } from "@/lib/virtualPet";

export default async function PetPage() {
  const session = await auth();

  if (!session?.user) {
    return <AuthForm />;
  }

  await dbConnect();

  const [userDoc, petDoc] = await Promise.all([
    User.findById(session.user.id).select("favoritePokemonId").lean(),
    VirtualPet.findOneAndUpdate(
      { userId: session.user.id },
      { $setOnInsert: { userId: session.user.id } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ),
  ]);

  // Mesma lógica de decaimento sob demanda da rota /api/pet — aqui rodada direto, sem round-trip
  // HTTP, já que esta é a carga inicial de um Server Component.
  const stats = petDoc.toObject();
  const decayed = applyDecay(stats, stats.lastUpdatedAt);
  const changed =
    decayed.hunger !== stats.hunger || decayed.happiness !== stats.happiness || decayed.energy !== stats.energy;

  if (changed) {
    await VirtualPet.updateOne(
      { _id: petDoc._id },
      {
        $set: {
          hunger: decayed.hunger,
          happiness: decayed.happiness,
          energy: decayed.energy,
          isSleeping: decayed.isSleeping,
          lastUpdatedAt: decayed.lastUpdatedAt,
        },
      }
    );
  }

  const pokemon = userDoc?.favoritePokemonId
    ? POKEMON_LIST.find((p) => p.id === userDoc.favoritePokemonId) ?? null
    : null;

  return (
    <PetView
      pokemon={pokemon}
      initialPet={{
        hunger: Math.round(decayed.hunger),
        happiness: Math.round(decayed.happiness),
        energy: Math.round(decayed.energy),
        isSleeping: decayed.isSleeping,
        xp: decayed.xp,
        level: getLevel(decayed.xp),
      }}
    />
  );
}
