import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  login: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: null },
  name: { type: String, default: null, trim: true },
  favoritePokemonId: { type: Number, default: null },
  gender: { type: String, enum: ["male", "female"], default: "male" },
  onboardingCompletedAt: { type: Date, default: null },
  whosThatTutorialSeenAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Ver models/Pokemon.js para o motivo deste guard (Fast Refresh + mongoose.models).
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model("User", UserSchema);
