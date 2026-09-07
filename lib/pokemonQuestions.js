import { after } from "next/server";
import PokemonQuestion from "@/models/PokemonQuestion";

// Mensagem fixa, decidida pelo código — nunca o texto livre que o modelo geraria — pra quando a
// pergunta não é sobre Pokémon (result.onTopic === false vindo de answerPokemonQuestion).
export const OFF_TOPIC_MESSAGE =
  "Isso não parece ser sobre Pokémon! Só sei responder perguntas sobre o mundo Pokémon. 🔴⚪";

export const QUESTION_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_PER_USER = 20;

export async function isQuestionRateLimited(userId) {
  const windowStart = new Date(Date.now() - QUESTION_RATE_LIMIT_WINDOW_MS);
  const count = await PokemonQuestion.countDocuments({ userId, createdAt: { $gte: windowStart } });
  return count >= RATE_LIMIT_MAX_PER_USER;
}

// O cliente não precisa esperar o registro terminar pra receber a resposta.
export function logPokemonQuestion(entry) {
  after(() =>
    PokemonQuestion.create(entry).catch((error) => {
      console.error("Falha ao registrar PokemonQuestion em background:", error.message);
    })
  );
}
