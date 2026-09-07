"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Onboarding.module.css";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl, itemSpriteUrl } from "@/lib/sprites";
import { speakText, stopSpeaking } from "@/lib/speech";

const ROTOM_ID = 479;
const SEEN_KEY = "vbox-scan-onboarding-seen";

const STEPS = [
  {
    id: "welcome",
    text: "Bem-vindo! Eu sou a Pokédex. Aponte a câmera do seu celular pra uma carta física de Pokémon e eu identifico ela pra você, com todas as informações e a voz lendo a descrição.",
  },
  {
    id: "done",
    text: "Prontinho! Toque em Escanear carta pra começar.",
  },
];

export function hasSeenOnboarding() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "true";
  } catch {
    // se não der pra checar (ex. modo privado), não trava mostrando de novo sem parar
    return true;
  }
}

export default function Onboarding({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const spokenStepRef = useRef(null);

  const step = STEPS[stepIndex];

  useEffect(() => stopSpeaking, []);

  useEffect(() => {
    // Adiado com setTimeout (mesmo padrão do autoSpeak de PokemonDetail.js) — sobrevive ao
    // ciclo de montagem/desmontagem/remontagem do StrictMode em dev.
    const timer = setTimeout(() => {
      if (spokenStepRef.current === step.id) return;
      spokenStepRef.current = step.id;
      speakText(step.text).catch((error) => console.error(error));
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- narra uma vez por passo, não a cada render
  }, [step.id]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const finish = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "true");
    } catch {
      // modo privado ou localStorage bloqueado — sem problema, só mostra de novo na próxima vez
    }
    stopSpeaking();
    onComplete();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dim} />

      <div className={styles.mascot}>
        <FallbackImage sources={[itemSpriteUrl("poke-ball")]} alt="" className={styles.mascotBall} />
        <div className={styles.rotomEmergeWrap}>
          <div className={styles.rotomBobWrap}>
            <FallbackImage
              sources={[animatedSpriteUrl("rotom"), officialArtworkUrl(ROTOM_ID), defaultSpriteUrl(ROTOM_ID)]}
              alt="Rotom, pilotando a Pokédex"
              className={styles.rotomSprite}
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.text}>{step.text}</p>
        {step.id === "welcome" ? (
          <button type="button" className={styles.primaryButton} onClick={goNext}>
            Continuar
          </button>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={finish}>
            Começar a usar
          </button>
        )}
        {step.id !== "done" && (
          <button type="button" className={styles.skipAll} onClick={finish}>
            Pular apresentação
          </button>
        )}
      </div>
    </div>
  );
}
