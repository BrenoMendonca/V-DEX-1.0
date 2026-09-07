import mongoose from "mongoose";

const PokemonSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  pokeApiId: { type: Number, required: true, index: true },
  sprites: {
    frontDefault: String,
    animated: String,
  },
  types: [String],
  stats: [
    {
      name: String,
      base: Number,
    },
  ],
  height: Number,
  weight: Number,
  abilities: [String],
  abilitiesDetailed: [
    {
      name: String,
      effect: String,
    },
  ],
  genus: String,
  genusPt: String,
  flavorText: String,
  flavorTextPt: String,
  eggGroups: [String],
  captureRate: Number,
  genderRate: Number,
  crySound: String,
  evolutionChain: [
    {
      id: Number,
      name: String,
      trigger: String,
    },
  ],
  varieties: [
    {
      id: Number,
      name: String,
      label: String,
    },
  ],
  // Mongoose sempre devolve [] pra um campo array não setado (mesmo em documentos antigos sem
  // a chave no Mongo), então "varieties.length === 0" não distingue "nunca calculado" de
  // "calculado e sem variantes de verdade" — esse marcador resolve isso, como o enrichedAt.
  varietiesComputedAt: { type: Date, default: null },
  enrichedAt: Date,
  raw: mongoose.Schema.Types.Mixed,
  fetchedAt: { type: Date, default: Date.now },
});

// Em dev, o servidor Next.js roda por horas e recarrega módulos individuais a cada
// alteração de schema (Fast Refresh) — mas o registro global do Mongoose (mongoose.models)
// não é limpo nesse processo, então um schema antigo ficaria "preso" em memória e
// descartaria silenciosamente campos novos ao salvar. Forçar o recompile evita isso.
if (mongoose.models.Pokemon) {
  delete mongoose.models.Pokemon;
}

export default mongoose.model("Pokemon", PokemonSchema);
