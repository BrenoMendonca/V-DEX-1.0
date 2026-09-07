"use client";

import { useEffect, useState } from "react";
import styles from "./CaptureReveal.module.css";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl, itemSpriteUrl } from "@/lib/sprites";
import { playCaught } from "@/lib/sfx";

const CATCH_DURATION_MS = 1600;
const REVEAL_DURATION_MS = 1200;
const CRY_DELAY_MS = 550;
const PARTICLE_COUNT = 10;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  angle: (360 / PARTICLE_COUNT) * i,
  delay: (i % 3) * 0.05,
}));

export default function CaptureReveal({ pokemon, onDone }) {
  const [phase, setPhase] = useState("catching");

  useEffect(() => {
    const phaseTimer = setTimeout(() => setPhase("revealed"), CATCH_DURATION_MS);
    return () => clearTimeout(phaseTimer);
  }, []);

  useEffect(() => {
    if (phase !== "revealed") return undefined;

    playCaught();

    const cryTimer = pokemon.crySound
      ? setTimeout(() => {
          const audio = new Audio(pokemon.crySound);
          audio.play().catch(() => {});
        }, CRY_DELAY_MS)
      : null;

    const doneTimer = setTimeout(() => onDone?.(), REVEAL_DURATION_MS);

    return () => {
      if (cryTimer) clearTimeout(cryTimer);
      clearTimeout(doneTimer);
    };
  }, [phase, onDone, pokemon.crySound]);

  const spriteSources = [
    animatedSpriteUrl(pokemon.name),
    officialArtworkUrl(pokemon.id),
    defaultSpriteUrl(pokemon.id),
  ];

  return (
    <div className={styles.overlay}>
      {phase === "catching" ? (
        <div className={styles.catchWrap}>
          <FallbackImage sources={spriteSources} alt="" className={styles.catchSilhouette} />
          <FallbackImage sources={[itemSpriteUrl("poke-ball")]} alt="" className={styles.catchBall} />
          <p className={styles.catchingText}>Capturando...</p>
        </div>
      ) : (
        <>
          <span className={styles.glow} aria-hidden="true" />
          <div className={styles.particles} aria-hidden="true">
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                className={styles.particle}
                style={{ "--angle": `${p.angle}deg`, animationDelay: `${p.delay}s` }}
              />
            ))}
          </div>
          <div className={styles.spriteWrap}>
            <FallbackImage sources={spriteSources} alt={pokemon.name} className={styles.sprite} />
          </div>
          <p className={styles.caughtText}>Pokémon identificado!</p>
          <p className={styles.name}>{pokemon.name.replace(/-/g, " ")}</p>
        </>
      )}
    </div>
  );
}
