import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import VirtualPet from "@/models/VirtualPet";
import { applyDecay, applyAction, getLevel, VALID_ACTIONS } from "@/lib/virtualPet";

function formatPet(stats) {
  return {
    hunger: Math.round(stats.hunger),
    happiness: Math.round(stats.happiness),
    energy: Math.round(stats.energy),
    isSleeping: stats.isSleeping,
    xp: stats.xp,
    level: getLevel(stats.xp),
  };
}

async function getDecayedPet(userId) {
  const doc = await VirtualPet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const stats = doc.toObject();
  const decayed = applyDecay(stats, stats.lastUpdatedAt);
  const changed =
    decayed.hunger !== stats.hunger || decayed.happiness !== stats.happiness || decayed.energy !== stats.energy;

  if (changed) {
    await VirtualPet.updateOne(
      { _id: doc._id },
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

  return { docId: doc._id, stats: decayed };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { stats } = await getDecayedPet(session.user.id);

  return NextResponse.json(formatPet(stats));
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = body?.action;
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  await dbConnect();
  // O decaimento é calculado e salvo ANTES de tentar a ação — mesmo uma ação recusada (ex:
  // alimentar um pet já saciado) não pode descartar um decaimento real que já aconteceu.
  const { docId, stats } = await getDecayedPet(session.user.id);

  const { stats: nextStats, result } = applyAction(stats, action);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  await VirtualPet.updateOne(
    { _id: docId },
    {
      $set: {
        hunger: nextStats.hunger,
        happiness: nextStats.happiness,
        energy: nextStats.energy,
        isSleeping: nextStats.isSleeping,
        xp: nextStats.xp,
      },
    }
  );

  return NextResponse.json(formatPet(nextStats));
}
