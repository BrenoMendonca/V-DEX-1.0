"use client";

import { useEffect, useState } from "react";
import styles from "./MiniGamesHub.module.css";
import WhosThatPokemon from "./WhosThatPokemon";
import WhosThatRegionSelect from "./WhosThatRegionSelect";
import MemoryGame from "./MemoryGame";
import PokedexQuiz from "./PokedexQuiz";
import { playPlink } from "@/lib/sfx";

const GAMES = [
  {
    id: "quem-e-esse",
    title: "Quem é esse Pokémon?",
    description: "Monte o nome do Pokémon clicando nas letras certas.",
  },
  {
    id: "jogo-da-memoria",
    title: "Jogo da Memória",
    description: "Vire as cartas e encontre os pares de Pokémon.",
  },
  {
    id: "quiz-da-pokedex",
    title: "Quiz da Pokédex",
    description: "Responda perguntas sobre altura, peso, categoria e grupo de ovos.",
  },
];

export default function MiniGamesHub({ dexCount, initialWhosThat, initialScore, showTutorial }) {
  const [activeGame, setActiveGame] = useState(null);
  // undefined = ainda não escolheu região (mostra a tela de escolha); null = "todas as regiões"
  const [whosThatGeneration, setWhosThatGeneration] = useState(undefined);

  useEffect(() => {
    const handleReset = (event) => {
      if (event.detail?.href !== "/jogos") return;
      setActiveGame(null);
      setWhosThatGeneration(undefined);
    };

    window.addEventListener("pokedex:tab-reset", handleReset);
    return () => window.removeEventListener("pokedex:tab-reset", handleReset);
  }, []);

  const handleSelect = (id) => {
    playPlink();
    setActiveGame(id);
    setWhosThatGeneration(undefined);
  };

  const handleBack = () => {
    playPlink();
    if (activeGame === "quem-e-esse" && whosThatGeneration !== undefined) {
      // Volta pra tela de escolha de região em vez de sair do jogo direto.
      setWhosThatGeneration(undefined);
      return;
    }
    setActiveGame(null);
  };

  if (activeGame) {
    const showRegionSelect = activeGame === "quem-e-esse" && whosThatGeneration === undefined;

    return (
      <div className={styles.gameWrap}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          &lt; {activeGame === "quem-e-esse" && whosThatGeneration !== undefined ? "Trocar região" : "Mini-jogos"}
        </button>

        {activeGame === "quem-e-esse" &&
          (showRegionSelect ? (
            <WhosThatRegionSelect onSelect={setWhosThatGeneration} />
          ) : (
            <WhosThatPokemon
              dexCount={dexCount}
              initialPokemon={initialWhosThat}
              initialScore={initialScore}
              showTutorial={showTutorial}
              generation={whosThatGeneration}
            />
          ))}

        {activeGame === "jogo-da-memoria" && <MemoryGame />}
        {activeGame === "quiz-da-pokedex" && <PokedexQuiz />}
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <p className={styles.menuTitle}>Mini-jogos</p>
      {GAMES.map((game) => (
        <button
          key={game.id}
          type="button"
          className={styles.gameCard}
          onClick={() => handleSelect(game.id)}
        >
          <p className={styles.gameCardTitle}>{game.title}</p>
          <p className={styles.gameCardDescription}>{game.description}</p>
        </button>
      ))}
    </div>
  );
}
