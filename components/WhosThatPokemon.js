"use client";

import { useEffect, useState } from "react";
import styles from "./WhosThatPokemon.module.css";
import FallbackImage from "./FallbackImage";
import WhosThatOnboarding from "./WhosThatOnboarding";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";
import { playCaught, playPlink } from "@/lib/sfx";

const GAME_ID = "quem-e-esse";

function pickRandomId(dexCount, generation) {
  const from = generation ? generation.from : 1;
  const to = generation ? Math.min(generation.to, dexCount) : dexCount;
  return Math.floor(Math.random() * (to - from + 1)) + from;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildTiles(name) {
  return shuffle(
    name
      .replace(/-/g, " ")
      .split("")
      .map((char, index) => ({ id: index, char }))
      .filter((tile) => tile.char !== " ")
  );
}

export default function WhosThatPokemon({ dexCount, initialPokemon, initialScore, showTutorial, generation }) {
  // A região já vem escolhida (tela anterior) — se não for "todas", o pokemon inicial vindo do
  // servidor não considera esse filtro (a escolha acontece no client), então busca um novo já
  // filtrado assim que monta, em vez de usar o initialPokemon.
  const usesServerInitial = !generation;

  const [pokemon, setPokemon] = useState(usesServerInitial ? initialPokemon : null);
  const [loading, setLoading] = useState(!usesServerInitial);
  const [status, setStatus] = useState("playing");
  const [score, setScore] = useState(initialScore ?? { correct: 0, total: 0, hintsUsed: 0 });
  const [hintsUsedThisRound, setHintsUsedThisRound] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(Boolean(showTutorial));
  const [tiles, setTiles] = useState(() =>
    usesServerInitial && initialPokemon ? buildTiles(initialPokemon.name) : []
  );
  const [slots, setSlots] = useState(() =>
    usesServerInitial && initialPokemon
      ? initialPokemon.name.replace(/-/g, " ").split("").map((char) => (char === " " ? "gap" : null))
      : []
  );
  const [lockedSlots, setLockedSlots] = useState(new Set());

  const displayChars = pokemon ? pokemon.name.replace(/-/g, " ").split("") : [];
  const placedTileIds = new Set(slots.filter((v) => v !== null && v !== "gap"));
  const allFilled = slots.every((v) => v !== null);
  const hasUnfilledLetterSlot = slots.some((v) => v === null);

  const resetRound = (nextPokemon) => {
    setStatus("playing");
    setTiles(buildTiles(nextPokemon.name));
    setSlots(nextPokemon.name.replace(/-/g, " ").split("").map((char) => (char === " " ? "gap" : null)));
    setLockedSlots(new Set());
    setHintsUsedThisRound(0);
  };

  const loadNext = async () => {
    setLoading(true);
    try {
      const id = pickRandomId(dexCount, generation);
      const response = await fetch(`/api/pokemon/${id}`);
      const data = await response.json();
      setPokemon(data);
      resetRound(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usesServerInitial) return undefined;
    const timer = setTimeout(() => loadNext(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só precisa buscar um pokemon filtrado uma vez, ao montar
  }, []);

  const submitScore = async (correct) => {
    try {
      const response = await fetch("/api/game-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: GAME_ID, correct, hintsUsed: hintsUsedThisRound }),
      });
      if (response.ok) {
        setScore(await response.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleTileClick = (tileId) => {
    if (status !== "playing" || placedTileIds.has(tileId)) return;
    const nextIndex = slots.findIndex((v) => v === null);
    if (nextIndex === -1) return;
    playPlink();
    const nextSlots = [...slots];
    nextSlots[nextIndex] = tileId;
    setSlots(nextSlots);
  };

  const handleSlotClick = (index) => {
    if (status !== "playing" || lockedSlots.has(index) || slots[index] === null || slots[index] === "gap")
      return;
    playPlink();
    const nextSlots = [...slots];
    nextSlots[index] = null;
    setSlots(nextSlots);
  };

  const handleHint = () => {
    if (status !== "playing") return;
    const targetIndex = slots.findIndex((v, i) => v === null && displayChars[i] !== " ");
    if (targetIndex === -1) return;

    const correctChar = displayChars[targetIndex];
    const tile = tiles.find((t) => t.char === correctChar && !placedTileIds.has(t.id));
    if (!tile) return;

    playPlink();
    const nextSlots = [...slots];
    nextSlots[targetIndex] = tile.id;
    setSlots(nextSlots);
    setLockedSlots((prev) => new Set(prev).add(targetIndex));
    setHintsUsedThisRound((n) => n + 1);
  };

  const handleCheck = () => {
    if (status !== "playing" || !allFilled) return;

    const guessedName = slots
      .map((tileId, i) => (tileId === "gap" ? "-" : tiles.find((t) => t.id === tileId)?.char ?? ""))
      .join("");

    if (guessedName === pokemon.name) {
      setStatus("correct");
      submitScore(true);
      playCaught();
      if (pokemon.crySound) {
        new Audio(pokemon.crySound).play().catch(() => {});
      }
      return;
    }

    playPlink();
    const nextLocked = new Set(lockedSlots);
    const nextSlots = [...slots];
    slots.forEach((tileId, i) => {
      if (tileId === "gap" || tileId === null) return;
      const char = tiles.find((t) => t.id === tileId)?.char;
      if (char === displayChars[i]) {
        nextLocked.add(i);
      } else {
        nextSlots[i] = null;
      }
    });
    setLockedSlots(nextLocked);
    setSlots(nextSlots);
  };

  const handleGiveUp = () => {
    if (status !== "playing") return;
    setStatus("gaveup");
    submitScore(false);
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    fetch("/api/user/game-tutorial", { method: "POST" }).catch((error) => console.error(error));
  };

  const handleReplayTutorial = () => {
    playPlink();
    setShowOnboarding(true);
  };

  const availableTiles = tiles.filter((tile) => !placedTileIds.has(tile.id));

  if (!pokemon) {
    return (
      <div className={styles.wrap}>
        <p className={styles.loadingText}>Procurando um Pokémon{generation ? ` de ${generation.region}` : ""}...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {showOnboarding && <WhosThatOnboarding onDismiss={handleDismissOnboarding} />}

      <div className={styles.scoreRow}>
        <button
          type="button"
          className={styles.helpButton}
          onClick={handleReplayTutorial}
          aria-label="Como jogar"
        >
          ?
        </button>
        <span>
          Acertos: {score.correct}/{score.total}
          {score.hintsUsed > 0 && (
            <span className={styles.hintsUsedLabel}> · {score.hintsUsed} dicas usadas</span>
          )}
        </span>
      </div>

      <p className={styles.regionLabel}>Região: {generation ? generation.region : "Todas"}</p>

      <div className={styles.silhouetteBox}>
        <FallbackImage
          sources={[
            animatedSpriteUrl(pokemon.name),
            officialArtworkUrl(pokemon.id),
            defaultSpriteUrl(pokemon.id),
          ]}
          alt={pokemon.name}
          className={styles.silhouette}
        />
      </div>

      <div className={styles.blanks}>
        {slots.map((tileId, i) =>
          tileId === "gap" ? (
            <span key={i} className={styles.blankGap} />
          ) : (
            <button
              key={i}
              type="button"
              className={`${styles.blankLetter} ${lockedSlots.has(i) ? styles.blankLetterLocked : ""}`}
              onClick={() => handleSlotClick(i)}
              disabled={status !== "playing" || lockedSlots.has(i) || tileId === null}
            >
              {status !== "playing"
                ? displayChars[i].toUpperCase()
                : tileId !== null
                  ? tiles.find((t) => t.id === tileId)?.char.toUpperCase()
                  : ""}
            </button>
          )
        )}
      </div>

      {status === "correct" && (
        <p className={styles.feedbackCorrect}>Isso mesmo! É {pokemon.name}!</p>
      )}
      {status === "gaveup" && (
        <p className={styles.feedbackWrong}>Era {pokemon.name}. Próxima!</p>
      )}

      {status === "playing" ? (
        <>
          <div className={styles.bank}>
            {availableTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={styles.tile}
                onClick={() => handleTileClick(tile.id)}
                disabled={loading}
              >
                {tile.char.toUpperCase()}
              </button>
            ))}
          </div>

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleCheck}
              disabled={loading || !allFilled}
            >
              Chutar
            </button>
            <button
              type="button"
              className={styles.hintButton}
              onClick={handleHint}
              disabled={loading || !hasUnfilledLetterSlot}
            >
              💡 Dica
            </button>
          </div>
          <button type="button" className={styles.giveUpButton} onClick={handleGiveUp}>
            Desistir / Revelar
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.nextButton}
          onClick={() => loadNext()}
          disabled={loading}
        >
          {loading ? "Carregando..." : "Próximo Pokémon"}
        </button>
      )}
    </div>
  );
}
