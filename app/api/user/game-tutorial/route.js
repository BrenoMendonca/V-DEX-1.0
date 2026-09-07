import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  await User.updateOne({ _id: session.user.id }, { $set: { whosThatTutorialSeenAt: new Date() } });

  return NextResponse.json({ ok: true });
}
