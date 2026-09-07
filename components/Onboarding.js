"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Onboarding.module.css";
import FavoritePokemonPicker from "./FavoritePokemonPicker";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl, itemSpriteUrl } from "@/lib/sprites";
import { speakText, stopSpeaking } from "@/lib/speech";

const ROTOM_ID = 479;

const STEPS = [
  { id: "welcome" },
  {
    id: "tour-scan",
    target: "nav-scan",
    text: "Aqui você aponta a câmera pra uma carta Pokémon física e eu identifico ela pra você.",
  },
  {
    id: "tour-dex",
    target: "nav-dex",
    text: "Aqui fica a sua Pokédex Nacional. Dá pra ver tudo que você já capturou e pesquisar qualquer outro Pokémon.",
  },
  {
    id: "tour-games",
    target: "nav-games",
    text: "Aqui tem mini-jogos pra testar o que você sabe sobre Pokémon.",
  },
  {
    id: "tour-profile",
    target: "nav-profile",
    text: "E aqui é o seu perfil, com suas estatísticas e o Pokémon favorito que você vai escolher já já.",
  },
  { id: "favorite" },
  { id: "done" },
];

function useSpotlightRect(target) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!target) return undefined;

    const update = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [target]);

  return target ? rect : null;
}

export default function Onboarding({ name, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [favorite, setFavorite] = useState(null);
  const [saving, setSaving] = useState(false);
  const spokenStepRef = useRef(null);

  const step = STEPS[stepIndex];
  const rect = useSpotlightRect(step.target);

  useEffect(() => stopSpeaking, []);

  useEffect(() => {
    // Adiado com setTimeout (igual o autoSpeak de PokemonDetail.js) — no StrictMode do dev,
    // React monta/desmonta/remonta o efeito de propósito; sem o adiamento, a chamada a
    // speakText() da 1ª tentativa já teria disparado o fetch de /api/speak quando a
    // "desmontagem" fantasma roda, e o stopSpeaking() dela invalidava essa voz sem nunca
    // tocar. Guardar e marcar o step só dentro do timeout garante que só a tentativa que
    // sobrevive (a 2ª) realmente fala.
    const timer = setTimeout(() => {
      if (spokenStepRef.current === step.id) return;
      spokenStepRef.current = step.id;

      let text = step.text;
      if (step.id === "welcome") {
        text = `Bem-vindo à sua jornada Pokémon, ${name}! Eu sou a Pokédex que o Professor Carvalho te deu pra te ajudar a conhecer novos Pokémon. Agora eu vou te mostrar rapidinho como eu funciono.`;
      }
      if (step.id === "favorite") text = "Pra fechar, me conta: qual é o seu Pokémon favorito?";
      if (step.id === "done") text = `Prontinho, ${name}! Agora é só explorar. Divirta-se!`;

      if (text) {
        speakText(text).catch((error) => console.error(error));
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- narra uma vez por passo, não a cada render
  }, [step.id]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const handleFavoriteChange = (pokemon) => {
    setFavorite(pokemon);
    if (pokemon) {
      speakText("Ótima escolha!").catch((error) => console.error(error));
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoritePokemonId: favorite?.id ?? null }),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
      stopSpeaking();
      onComplete();
    }
  };

  const spotlightStyle = rect
    ? {
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : null;

  return (
    <div className={styles.overlay}>
      {spotlightStyle ? (
        <div className={styles.spotlight} style={spotlightStyle} />
      ) : (
        <div className={styles.dim} />
      )}

      <div className={styles.mascot}>
        <FallbackImage
          sources={[itemSpriteUrl("poke-ball")]}
          alt=""
          className={styles.mascotBall}
        />
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
        {step.id === "welcome" && (
          <>
            <p className={styles.text}>
              Bem-vindo à sua jornada Pokémon, {name}! Eu sou a Pokédex que o Professor Carvalho te
              deu pra te ajudar a conhecer novos Pokémon. Agora eu vou te mostrar rapidinho como eu
              funciono.
            </p>
            <button type="button" className={styles.primaryButton} onClick={goNext}>
              Continuar
            </button>
          </>
        )}

        {step.target && (
          <>
            <p className={styles.text}>{step.text}</p>
            <button type="button" className={styles.primaryButton} onClick={goNext}>
              Continuar
            </button>
          </>
        )}

        {step.id === "favorite" && (
          <>
            <p className={styles.text}>
              {favorite ? "Ótima escolha!" : "Pra fechar, me conta: qual é o seu Pokémon favorito?"}
            </p>
            <FavoritePokemonPicker value={favorite} onChange={handleFavoriteChange} />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={goNext}
              disabled={!favorite}
            >
              Continuar
            </button>
            <button type="button" className={styles.skipLink} onClick={goNext}>
              Prefiro não escolher agora
            </button>
          </>
        )}

        {step.id === "done" && (
          <>
            <p className={styles.text}>Prontinho, {name}! Agora é só explorar. Divirta-se!</p>
            <button type="button" className={styles.primaryButton} onClick={finish} disabled={saving}>
              {saving ? "Salvando..." : "Começar a usar"}
            </button>
          </>
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
