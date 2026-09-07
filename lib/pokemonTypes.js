export const POKEMON_TYPES = [
  { value: "normal", label: "Normal", color: "#a8a878" },
  { value: "fire", label: "Fogo", color: "#f08030" },
  { value: "water", label: "Água", color: "#6890f0" },
  { value: "electric", label: "Elétrico", color: "#f8d030" },
  { value: "grass", label: "Planta", color: "#78c850" },
  { value: "ice", label: "Gelo", color: "#98d8d8" },
  { value: "fighting", label: "Lutador", color: "#c03028" },
  { value: "poison", label: "Venenoso", color: "#a040a0" },
  { value: "ground", label: "Terra", color: "#e0c068" },
  { value: "flying", label: "Voador", color: "#a890f0" },
  { value: "psychic", label: "Psíquico", color: "#f85888" },
  { value: "bug", label: "Inseto", color: "#a8b820" },
  { value: "rock", label: "Pedra", color: "#b8a038" },
  { value: "ghost", label: "Fantasma", color: "#705898" },
  { value: "dragon", label: "Dragão", color: "#7038f8" },
  { value: "dark", label: "Sombrio", color: "#705848" },
  { value: "steel", label: "Aço", color: "#b8b8d0" },
  { value: "fairy", label: "Fada", color: "#ee99ac" },
];

export const TYPE_COLORS = Object.fromEntries(POKEMON_TYPES.map((t) => [t.value, t.color]));
export const TYPE_LABELS = Object.fromEntries(POKEMON_TYPES.map((t) => [t.value, t.label]));

export function typeLabel(type) {
  return TYPE_LABELS[type] ?? type;
}

export function typeBackground(type) {
  const color = TYPE_COLORS[type] ?? "#444";
  return `linear-gradient(160deg, ${color}33 0%, var(--surface-bg) 55%)`;
}
