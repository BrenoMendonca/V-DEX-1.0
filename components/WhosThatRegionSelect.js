"use client";

import styles from "./WhosThatRegionSelect.module.css";
import { PokeballIcon } from "./icons";
import { GENERATIONS } from "@/lib/generations";
import { playPlink } from "@/lib/sfx";

export default function WhosThatRegionSelect({ onSelect }) {
  const handlePick = (generation) => {
    playPlink();
    onSelect(generation);
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Escolha uma região</p>
      <p className={styles.subtitle}>De qual região vêm os Pokémon desse jogo?</p>

      <div className={styles.list}>
        <button type="button" className={styles.option} onClick={() => handlePick(null)}>
          <PokeballIcon className={styles.optionBall} />
          <div>
            <p className={styles.optionTitle}>Todas as regiões</p>
            <p className={styles.optionSubtitle}>Qualquer Pokémon da Pokédex nacional</p>
          </div>
        </button>

        {GENERATIONS.map((gen) => (
          <button
            type="button"
            key={gen.id}
            className={styles.option}
            onClick={() => handlePick(gen)}
          >
            <PokeballIcon className={styles.optionBall} />
            <div>
              <p className={styles.optionTitle}>{gen.region}</p>
              <p className={styles.optionSubtitle}>{gen.label}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
