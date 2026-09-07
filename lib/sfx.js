const SOUNDS = {
  levelUp: "/sounds/level-up.mp3",
  plink: "/sounds/plink.mp3",
  caught: "/sounds/caught.mp3",
};

function playAndWait(src, { volume = 1, maxMs = 4000 } = {}) {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(src);
      audio.volume = volume;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
      audio.play().catch(finish);
      setTimeout(finish, maxMs);
    } catch {
      resolve();
    }
  });
}

// Toca antes da Pokédex falar e resolve quando o som termina (ou no timeout de segurança).
export function playLevelUpChime() {
  return playAndWait(SOUNDS.levelUp);
}

// Clique nos botões físicos da Pokédex — dispara e não bloqueia a navegação/ação do botão.
export function playPlink() {
  try {
    const audio = new Audio(SOUNDS.plink);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // sfx não é essencial — falha silenciosa
  }
}

// Toca na revelação do Pokémon escaneado — dispara e não bloqueia a animação.
export function playCaught() {
  try {
    const audio = new Audio(SOUNDS.caught);
    audio.play().catch(() => {});
  } catch {
    // sfx não é essencial — falha silenciosa
  }
}
