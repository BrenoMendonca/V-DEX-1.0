import mongoose from "mongoose";

const ScanHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  ip: { type: String, index: true },
  imageHash: { type: String, index: true },
  status: {
    type: String,
    enum: ["identified", "not_identified", "error"],
    required: true,
  },
  pokemonName: { type: String, lowercase: true, default: null },
  confidence: { type: Number, default: null },
  errorMessage: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

ScanHistorySchema.index({ ip: 1, createdAt: -1 });
ScanHistorySchema.index({ imageHash: 1, createdAt: -1 });
ScanHistorySchema.index({ userId: 1, status: 1 });
ScanHistorySchema.index({ userId: 1, createdAt: -1 });

if (mongoose.models.ScanHistory) {
  delete mongoose.models.ScanHistory;
}

export default mongoose.model("ScanHistory", ScanHistorySchema);
