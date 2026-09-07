import { auth } from "@/auth";
import AuthForm from "@/components/AuthForm";
import ProfileView from "@/components/ProfileView";
import { getProfileStats, daysSince } from "@/lib/profile";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { POKEMON_LIST } from "@/lib/pokemonList";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function trainerIdFromObjectId(id) {
  const hex = String(id).slice(-6);
  return String(parseInt(hex, 16) % 100000).padStart(5, "0");
}

export default async function PerfilPage() {
  const session = await auth();

  if (!session?.user) {
    return <AuthForm />;
  }

  await dbConnect();
  const userDoc = await User.findById(session.user.id).lean();
  const stats = await getProfileStats(session.user.id);

  const favoritePokemon = userDoc?.favoritePokemonId
    ? POKEMON_LIST.find((p) => p.id === userDoc.favoritePokemonId) ?? null
    : null;

  const createdAt = userDoc?.createdAt ?? new Date();
  const daysSinceStart = daysSince(createdAt);
  const percent = Math.round((stats.capturedCount / stats.dexCount) * 100);

  return (
    <ProfileView
      stats={stats}
      user={{
        login: session.user.login,
        name: userDoc?.name ?? null,
        avatar: userDoc?.avatar ?? null,
        favoritePokemon,
        gender: userDoc?.gender ?? "male",
      }}
      trainerCard={{
        trainerId: trainerIdFromObjectId(userDoc?._id ?? session.user.id),
        percent,
        score: stats.totalScans,
        daysSinceStart,
        startDate: dateFormatter.format(new Date(createdAt)),
      }}
    />
  );
}
