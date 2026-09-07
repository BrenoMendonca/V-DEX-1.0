import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

const LOGIN_REGEX = /^[a-z0-9_.-]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const NAME_MAX_LENGTH = 40;

// Limite simples em memória (por instância) contra spam de contas — não precisa de uma
// coleção nova só pra isso; imperfeito em serverless com múltiplas instâncias, mas já
// evita o caso comum de um script disparando várias contas em sequência.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_PER_IP = 5;
const attemptsByIp = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const attempts = (attemptsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  attempts.push(now);
  attemptsByIp.set(ip, attempts);
  return attempts.length > RATE_LIMIT_MAX_PER_IP;
}

export async function POST(request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  await dbConnect();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const login = String(body?.login ?? "").trim().toLowerCase();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim().slice(0, NAME_MAX_LENGTH);

  if (!LOGIN_REGEX.test(login)) {
    return NextResponse.json({ error: "invalid_login" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const existing = await User.findOne({ $or: [{ login }, { email }] });
  if (existing) {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ login, email, passwordHash, name });

  return NextResponse.json({ ok: true });
}
