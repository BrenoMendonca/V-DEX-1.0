import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import GameScore from "@/models/GameScore";

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const game = new URL(request.url).searchParams.get("game");
  if (!game) {
    return NextResponse.json({ error: "missing_game" }, { status: 400 });
  }

  await dbConnect();
  const doc = await GameScore.findOne({ userId: session.user.id, game }).lean();

  return NextResponse.json({
    correct: doc?.correct ?? 0,
    total: doc?.total ?? 0,
    hintsUsed: doc?.hintsUsed ?? 0,
  });
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

  const game = String(body?.game ?? "");
  if (!game) {
    return NextResponse.json({ error: "missing_game" }, { status: 400 });
  }

  const correct = Boolean(body?.correct);
  const hintsUsed = Number.isInteger(body?.hintsUsed) && body.hintsUsed > 0 ? body.hintsUsed : 0;

  await dbConnect();
  const doc = await GameScore.findOneAndUpdate(
    { userId: session.user.id, game },
    { $inc: { total: 1, correct: correct ? 1 : 0, hintsUsed }, $set: { updatedAt: new Date() } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return NextResponse.json({ correct: doc.correct, total: doc.total, hintsUsed: doc.hintsUsed });
}
