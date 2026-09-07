import mongoose from "mongoose";

const VirtualPetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  hunger: { type: Number, default: 100 },
  happiness: { type: Number, default: 100 },
  energy: { type: Number, default: 100 },
  isSleeping: { type: Boolean, default: false },
  xp: { type: Number, default: 0 },
  lastUpdatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Ver models/Pokemon.js para o motivo deste guard (Fast Refresh + mongoose.models).
if (mongoose.models.VirtualPet) {
  delete mongoose.models.VirtualPet;
}

export default mongoose.model("VirtualPet", VirtualPetSchema);
