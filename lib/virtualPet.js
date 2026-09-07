const MAX_STAT = 100;
const MIN_STAT = 0;

// Taxas de decaimento em ms por ponto — puramente calculado sob demanda (sem cron), a partir do
// tempo decorrido desde lastUpdatedAt. Ajustável, mas escolhido pra um ritmo de "cuidar 1-2x por
// dia", não algo que puna quem esquece de abrir o app por algumas horas.
const HUNGER_DECAY_MS = 15 * 60 * 1000;
const HAPPINESS_DECAY_MS = 20 * 60 * 1000;
const HAPPINESS_DECAY_MULTIPLIER_AT_ZERO_HUNGER = 2;
const ENERGY_AWAKE_DECAY_MS = 25 * 60 * 1000;
const ENERGY_ASLEEP_RECOVER_MS = 6 * 60 * 1000;

const XP_PER_LEVEL = 100;
const FEED_HUNGER_GAIN = 25;
const FEED_XP_GAIN = 5;
const PLAY_HAPPINESS_GAIN = 20;
const PLAY_ENERGY_COST = 10;
const PLAY_XP_GAIN = 8;

export const VALID_ACTIONS = ["feed", "play", "sleep", "wake"];

function clamp(value) {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, value));
}

export function getLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// Recalcula os stats a partir do tempo decorrido desde a última vez que foram salvos. Não
// arredonda nada aqui — arredondar só na hora de exibir/responder, senão leituras frequentes e
// espaçadas perderiam decaimento fracionário toda vez que o valor arredondado "não mudasse".
export function applyDecay(stats, lastUpdatedAt, now = new Date()) {
  const elapsedMs = Math.max(0, now.getTime() - new Date(lastUpdatedAt).getTime());
  if (elapsedMs === 0) {
    return { ...stats, lastUpdatedAt: new Date(lastUpdatedAt) };
  }

  const hunger = clamp(stats.hunger - elapsedMs / HUNGER_DECAY_MS);

  // A fome já recalculada (não a antiga) decide a taxa de felicidade nessa mesma janela.
  const happinessDecayMs =
    hunger <= MIN_STAT ? HAPPINESS_DECAY_MS / HAPPINESS_DECAY_MULTIPLIER_AT_ZERO_HUNGER : HAPPINESS_DECAY_MS;
  const happiness = clamp(stats.happiness - elapsedMs / happinessDecayMs);

  let energy;
  let isSleeping = stats.isSleeping;
  if (isSleeping) {
    energy = clamp(stats.energy + elapsedMs / ENERGY_ASLEEP_RECOVER_MS);
    if (energy >= MAX_STAT) {
      isSleeping = false;
    }
  } else {
    energy = clamp(stats.energy - elapsedMs / ENERGY_AWAKE_DECAY_MS);
  }

  return {
    hunger,
    happiness,
    energy,
    isSleeping,
    xp: stats.xp,
    lastUpdatedAt: now,
  };
}

const REJECT = (stats, reason) => ({ stats, result: { ok: false, reason } });
const ACCEPT = (stats) => ({ stats, result: { ok: true } });

// Espera stats já com o decaimento aplicado (applyDecay rodado antes). Nunca mexe em
// lastUpdatedAt — quem chama decide se/quando persistir isso.
export function applyAction(stats, action) {
  switch (action) {
    case "feed": {
      if (stats.isSleeping) return REJECT(stats, "pet_sleeping");
      if (stats.hunger >= MAX_STAT) return REJECT(stats, "already_full");
      return ACCEPT({
        ...stats,
        hunger: clamp(stats.hunger + FEED_HUNGER_GAIN),
        xp: stats.xp + FEED_XP_GAIN,
      });
    }
    case "play": {
      if (stats.isSleeping) return REJECT(stats, "pet_sleeping");
      if (stats.happiness >= MAX_STAT) return REJECT(stats, "already_happy");
      if (stats.energy <= MIN_STAT) return REJECT(stats, "too_tired");
      return ACCEPT({
        ...stats,
        happiness: clamp(stats.happiness + PLAY_HAPPINESS_GAIN),
        energy: clamp(stats.energy - PLAY_ENERGY_COST),
        xp: stats.xp + PLAY_XP_GAIN,
      });
    }
    case "sleep": {
      if (stats.isSleeping) return REJECT(stats, "already_sleeping");
      if (stats.energy >= MAX_STAT) return REJECT(stats, "not_tired");
      return ACCEPT({ ...stats, isSleeping: true });
    }
    case "wake": {
      if (!stats.isSleeping) return REJECT(stats, "not_sleeping");
      return ACCEPT({ ...stats, isSleeping: false });
    }
    default:
      return REJECT(stats, "invalid_action");
  }
}
