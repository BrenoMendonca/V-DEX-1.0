"use client";

import { useEffect } from "react";
import styles from "./WhosThatOnboarding.module.css";
import { speakText, stopSpeaking } from "@/lib/speech";

const EXPLANATION_TEXT =
  "Bem-vindo ao Quem é esse Pokémon! Eu mostro a sprite de um Pokémon e você monta o nome dele clicando " +
  "nas letras certas, na ordem certa. Se errar, as letras que já estavam no lugar certo ficam travadas, " +
  "e as outras voltam pro banco pra você tentar de novo. Ficou difícil? Use uma dica pra travar uma letra " +
  "sozinho. Vamos jogar?";

export default function WhosThatOnboarding({ onDismiss }) {
  useEffect(() => {
    // Adiado com setTimeout — mesmo motivo do onboarding principal (Onboarding.js): no
    // StrictMode do dev, sem isso a fala da primeira montagem podia não tocar.
    const timer = setTimeout(() => {
      speakText(EXPLANATION_TEXT).catch((error) => console.error(error));
    }, 0);

    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, []);

  const handleDismiss = () => {
    stopSpeaking();
    onDismiss();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <p className={styles.title}>Quem é esse Pokémon?</p>
        <p className={styles.text}>{EXPLANATION_TEXT}</p>
        <button type="button" className={styles.primaryButton} onClick={handleDismiss}>
          Vamos jogar!
        </button>
      </div>
    </div>
  );
}
