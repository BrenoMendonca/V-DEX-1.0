import { auth } from "@/auth";
import MiniGamesHub from "@/components/MiniGamesHub";
import { getNationalDexCount, getPokemonByNameOrId } from "@/lib/pokeapi";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import GameScore from "@/models/GameScore";

const WHOS_THAT_GAME_ID = "quem-e-esse";

function randomId(dexCount) {
  return Math.floor(Math.random() * dexCount) + 1;
}

export default async function JogosPage() {
  const session = await auth();
  const dexCount = await getNationalDexCount();
  const initialWhosThat = await getPokemonByNameOrId(randomId(dexCount));

  let initialScore = { correct: 0, total: 0, hintsUsed: 0 };
  let showTutorial = false;

  if (session?.user) {
    await dbConnect();
    const [scoreDoc, userDoc] = await Promise.all([
      GameScore.findOne({ userId: session.user.id, game: WHOS_THAT_GAME_ID }).lean(),
      User.findById(session.user.id).select("whosThatTutorialSeenAt").lean(),
    ]);
    if (scoreDoc) {
      initialScore = { correct: scoreDoc.correct, total: scoreDoc.total, hintsUsed: scoreDoc.hintsUsed };
    }
    showTutorial = !userDoc?.whosThatTutorialSeenAt;
  }

  return (
    <MiniGamesHub
      dexCount={dexCount}
      initialWhosThat={initialWhosThat}
      initialScore={initialScore}
      showTutorial={showTutorial}
    />
  );
}
