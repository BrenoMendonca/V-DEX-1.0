import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

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

  const gender = body?.gender === "female" ? "female" : "male";

  await dbConnect();
  await User.updateOne({ _id: session.user.id }, { $set: { gender } });

  return NextResponse.json({ ok: true });
}
