const DEFENSIVE_CHART = {
  normal: { weak: ["fighting"], resist: [], immune: ["ghost"] },
  fire: { weak: ["water", "ground", "rock"], resist: ["fire", "grass", "ice", "bug", "steel", "fairy"], immune: [] },
  water: { weak: ["electric", "grass"], resist: ["fire", "water", "ice", "steel"], immune: [] },
  electric: { weak: ["ground"], resist: ["electric", "flying", "steel"], immune: [] },
  grass: { weak: ["fire", "ice", "poison", "flying", "bug"], resist: ["water", "electric", "grass", "ground"], immune: [] },
  ice: { weak: ["fire", "fighting", "rock", "steel"], resist: ["ice"], immune: [] },
  fighting: { weak: ["flying", "psychic", "fairy"], resist: ["bug", "rock", "dark"], immune: [] },
  poison: { weak: ["ground", "psychic"], resist: ["grass", "fighting", "poison", "bug", "fairy"], immune: [] },
  ground: { weak: ["water", "grass", "ice"], resist: ["poison", "rock"], immune: ["electric"] },
  flying: { weak: ["electric", "ice", "rock"], resist: ["grass", "fighting", "bug"], immune: ["ground"] },
  psychic: { weak: ["bug", "ghost", "dark"], resist: ["fighting", "psychic"], immune: [] },
  bug: { weak: ["fire", "flying", "rock"], resist: ["grass", "fighting", "ground"], immune: [] },
  rock: { weak: ["water", "grass", "fighting", "ground", "steel"], resist: ["normal", "fire", "poison", "flying"], immune: [] },
  ghost: { weak: ["ghost", "dark"], resist: ["poison", "bug"], immune: ["normal", "fighting"] },
  dragon: { weak: ["ice", "dragon", "fairy"], resist: ["fire", "water", "grass", "electric"], immune: [] },
  dark: { weak: ["fighting", "bug", "fairy"], resist: ["ghost", "dark"], immune: ["psychic"] },
  steel: { weak: ["fire", "fighting", "ground"], resist: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"], immune: ["poison"] },
  fairy: { weak: ["poison", "steel"], resist: ["fighting", "bug", "dark"], immune: ["dragon"] },
};

const ALL_TYPES = Object.keys(DEFENSIVE_CHART);

function multiplierAgainst(defendingType, attackingType) {
  const chart = DEFENSIVE_CHART[defendingType];
  if (!chart) return 1;
  if (chart.immune.includes(attackingType)) return 0;
  if (chart.weak.includes(attackingType)) return 2;
  if (chart.resist.includes(attackingType)) return 0.5;
  return 1;
}

export function computeWeaknesses(types) {
  const multipliers = {};

  for (const attackingType of ALL_TYPES) {
    let multiplier = 1;
    for (const defendingType of types) {
      multiplier *= multiplierAgainst(defendingType, attackingType);
    }
    multipliers[attackingType] = multiplier;
  }

  const bucket = (value) =>
    Object.entries(multipliers)
      .filter(([, m]) => m === value)
      .map(([type]) => type);

  return {
    quadrupleWeak: bucket(4),
    doubleWeak: bucket(2),
    halfResist: bucket(0.5),
    quarterResist: bucket(0.25),
    immune: bucket(0),
  };
}
