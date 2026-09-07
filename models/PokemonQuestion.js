import mongoose from "mongoose";

const PokemonQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  pokemonName: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, default: null },
  viaAudio: { type: Boolean, default: false },
  onTopic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

if (mongoose.models.PokemonQuestion) delete mongoose.models.PokemonQuestion;
export default mongoose.model("PokemonQuestion", PokemonQuestionSchema);
