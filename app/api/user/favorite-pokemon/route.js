import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { defaultSpriteUrl } from "@/lib/sprites";

export async function PATCH(request) {
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

  const favoritePokemonId = Number.isInteger(body?.favoritePokemonId) ? body.favoritePokemonId : null;
  if (!favoritePokemonId) {
    return NextResponse.json({ error: "invalid_pokemon" }, { status: 400 });
  }

  await dbConnect();
  await User.updateOne(
    { _id: session.user.id },
    { $set: { favoritePokemonId, avatar: defaultSpriteUrl(favoritePokemonId) } }
  );

  return NextResponse.json({ ok: true });
}
