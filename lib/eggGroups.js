export const EGG_GROUP_LABELS = {
  monster: "Monstro",
  water1: "Água 1",
  water2: "Água 2",
  water3: "Água 3",
  bug: "Inseto",
  flying: "Voador",
  ground: "Terrestre",
  fairy: "Fada",
  plant: "Planta",
  humanshape: "Humanoide",
  mineral: "Mineral",
  indeterminate: "Amorfo",
  "no-eggs": "Sem ovos",
  ditto: "Ditto",
  dragon: "Dragão",
};

export function eggGroupLabel(name) {
  return EGG_GROUP_LABELS[name] ?? name;
}
