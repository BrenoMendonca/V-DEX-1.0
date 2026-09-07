import mongoose from "mongoose";

const GameScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  game: { type: String, required: true, index: true },
  correct: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

GameScoreSchema.index({ userId: 1, game: 1 }, { unique: true });

// Ver models/Pokemon.js para o motivo deste guard (Fast Refresh + mongoose.models).
if (mongoose.models.GameScore) {
  delete mongoose.models.GameScore;
}

export default mongoose.model("GameScore", GameScoreSchema);
