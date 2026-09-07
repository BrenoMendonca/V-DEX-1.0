const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_MODEL = "s2.1-pro-free";

export async function synthesizeSpeechFish(text) {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  const voiceId = process.env.FISH_AUDIO_VOICE_ID;

  if (!apiKey || !voiceId) {
    throw new Error("FISH_AUDIO_API_KEY ou FISH_AUDIO_VOICE_ID não estão definidas em .env.local");
  }

  const response = await fetch(FISH_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: FISH_MODEL,
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format: "mp3",
      mp3_bitrate: 128,
      // "normalize" aplica regras de normalização de texto específicas do inglês
      // (e chinês); como nosso texto é em português, isso pode ser a causa do
      // sotaque de inglês relatado ao usar a API (o site não teve esse problema).
      normalize: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Fish Audio respondeu ${response.status}: ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
