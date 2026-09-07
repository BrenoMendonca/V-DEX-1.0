import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;
const AVATAR_DATA_URL_REGEX = /^data:image\/(jpeg|png|webp);base64,/;

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const avatar = body?.avatar;
  if (typeof avatar !== "string" || !AVATAR_DATA_URL_REGEX.test(avatar)) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const approxBytes = (avatar.length * 3) / 4;
  if (approxBytes > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "image_too_large" }, { status: 400 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, { avatar });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, { avatar: null });

  return NextResponse.json({ ok: true });
}
