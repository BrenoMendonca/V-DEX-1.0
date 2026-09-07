"use client";

import { useState } from "react";
import styles from "./MemoryGame.module.css";
import FallbackImage from "./FallbackImage";
import { PokeballIcon } from "./icons";
import { defaultSpriteUrl } from "@/lib/sprites";
import { POKEMON_LIST } from "@/lib/pokemonList";
import { playPlink, playCaught } from "@/lib/sfx";

const PAIR_COUNT = 8;
const MISMATCH_DELAY_MS = 800;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const chosen = shuffle(POKEMON_LIST).slice(0, PAIR_COUNT);
  const cards = chosen.flatMap((p, pairIndex) => [
    { cardId: pairIndex * 2, pokemonId: p.id, name: p.name },
    { cardId: pairIndex * 2 + 1, pokemonId: p.id, name: p.name },
  ]);
  return shuffle(cards);
}

export default function MemoryGame() {
  const [cards, setCards] = useState(() => buildDeck());
  const [flipped, setFlipped] = useState([]);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);

  const matchedPairs = matchedIds.size / 2;
  const won = matchedPairs === PAIR_COUNT;

  const handleCardClick = (card) => {
    if (busy || won) return;
    if (matchedIds.has(card.cardId) || flipped.includes(card.cardId) || flipped.length >= 2) return;

    playPlink();
    const nextFlipped = [...flipped, card.cardId];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstId, secondId] = nextFlipped;
      const first = cards.find((c) => c.cardId === firstId);
      const second = cards.find((c) => c.cardId === secondId);

      if (first.pokemonId === second.pokemonId) {
        playCaught();
        setMatchedIds((prev) => new Set(prev).add(firstId).add(secondId));
        setFlipped([]);
      } else {
        setBusy(true);
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, MISMATCH_DELAY_MS);
      }
    }
  };

  const handleRestart = () => {
    playPlink();
    setCards(buildDeck());
    setFlipped([]);
    setMatchedIds(new Set());
    setMoves(0);
    setBusy(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.statusRow}>
        <span>
          Pares: {matchedPairs}/{PAIR_COUNT}
        </span>
        <span>Tentativas: {moves}</span>
      </div>

      {won ? (
        <div className={styles.winBox}>
          <p className={styles.winText}>
            Parabéns! Você encontrou todos os pares em {moves} {moves === 1 ? "tentativa" : "tentativas"}.
          </p>
          <button type="button" className={styles.restartButton} onClick={handleRestart}>
            Jogar de novo
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {cards.map((card) => {
            const isRevealed = flipped.includes(card.cardId) || matchedIds.has(card.cardId);
            return (
              <button
                key={card.cardId}
                type="button"
                className={styles.card}
                onClick={() => handleCardClick(card)}
                disabled={isRevealed || busy}
                aria-label={isRevealed ? card.name : "Carta virada pra baixo"}
              >
                {isRevealed ? (
                  <span
                    key="front"
                    className={`${styles.cardFront} ${matchedIds.has(card.cardId) ? styles.cardFrontMatched : ""}`}
                  >
                    <FallbackImage
                      sources={[defaultSpriteUrl(card.pokemonId)]}
                      alt={card.name}
                      className={styles.cardSprite}
                    />
                  </span>
                ) : (
                  <span key="back" className={styles.cardBack}>
                    <PokeballIcon className={styles.cardBackIcon} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
