import { playLevelUpChime } from "@/lib/sfx";

let currentAudio = null;
let currentUrl = null;
// stopSpeaking() só consegue pausar um áudio que já existe — se uma chamada anterior ainda
// estiver esperando o fetch de /api/speak (ou o chime) terminar quando uma nova voz é
// disparada, ela criava o Audio e tocava mesmo assim, sobrepondo com a voz nova. Esse token
// invalida qualquer playText() em andamento assim que outro é chamado.
let requestToken = 0;

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Formas alternativas (Mega Evolução, Gigantamax, regionais) têm nomes com hífen na PokeAPI
// (ex: "charizard-mega-x") — fica estranho falado com hífen, então troca por espaço antes.
function formatPokemonName(name) {
  return name.replace(/-/g, " ").split(" ").map(capitalize).join(" ");
}

function findPreEvolution(pokemon) {
  const chain = pokemon.evolutionChain;
  if (!chain || chain.length < 2) return null;
  const index = chain.findIndex((stage) => stage.id === pokemon.id);
  if (index <= 0) return null;
  return chain[index - 1];
}

function buildEntryText(pokemon) {
  const description = pokemon.flavorTextPt || pokemon.flavorText || "";
  const genus = pokemon.genusPt || pokemon.genus;
  const preEvolution = findPreEvolution(pokemon);
  const preEvolutionText = preEvolution ? `Evolui de ${formatPokemonName(preEvolution.name)}. ` : "";
  return `${preEvolutionText}${formatPokemonName(pokemon.name)}. ${genus ? genus + ". " : ""}${description}`;
}

async function playText(text, { onStart, onEnd, chime = false } = {}) {
  stopSpeaking();
  const myToken = requestToken;

  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Falha ao gerar áudio da Pokédex");
  }

  const blob = await response.blob();

  // Outra chamada (stopSpeaking() ou um novo playText()) aconteceu enquanto esperava a
  // resposta — essa voz não é mais a atual, descarta sem tocar.
  if (myToken !== requestToken) return;

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  currentAudio = audio;
  currentUrl = url;

  audio.onended = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    onEnd?.();
  };

  if (chime) {
    await playLevelUpChime();
  }

  if (myToken !== requestToken) {
    URL.revokeObjectURL(url);
    return;
  }

  onStart?.();
  await audio.play();
}

export async function speakPokemonEntry(pokemon, options = {}) {
  return playText(buildEntryText(pokemon), { ...options, chime: true });
}

// Fala um texto qualquer (ex: narração do onboarding), sem o efeito de "Level Up" que é específico da revelação de Pokémon.
export async function speakText(text, options = {}) {
  return playText(text, { ...options, chime: false });
}

export function stopSpeaking() {
  requestToken++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}
