// Versão sem banco: limite de taxa em memória por IP (mesmo padrão usado em
// app/api/auth/register/route.js), sem log persistido em lugar nenhum.

// Mensagem fixa, decidida pelo código — nunca o texto livre que o modelo geraria — pra quando a
// pergunta não é sobre Pokémon (result.onTopic === false vindo de answerPokemonQuestion).
export const OFF_TOPIC_MESSAGE =
  "Isso não parece ser sobre Pokémon! Só sei responder perguntas sobre o mundo Pokémon. 🔴⚪";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_PER_IP = 20;
const attemptsByIp = new Map();

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function isQuestionRateLimited(ip) {
  const now = Date.now();
  const attempts = (attemptsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  attempts.push(now);
  attemptsByIp.set(ip, attempts);
  return attempts.length > RATE_LIMIT_MAX_PER_IP;
}
