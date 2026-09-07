"use client";

import { useState } from "react";
import styles from "./TrainerCard.module.css";
import { StarIcon } from "./icons";
import { playPlink } from "@/lib/sfx";

const SPRITES = {
  male: "/Images/brendan-gen3.png",
  female: "/Images/may-gen3.png",
};

export default function TrainerCard({
  trainerId,
  name,
  gender: initialGender,
  percent,
  score,
  daysSinceStart,
  startDate,
}) {
  const [gender, setGender] = useState(initialGender === "female" ? "female" : "male");
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    playPlink();
    setFlipped((f) => !f);
  };

  const handleFlipKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleFlip();
    }
  };

  const handleGenderChange = async (event, nextGender) => {
    event.stopPropagation();
    if (nextGender === gender) return;
    playPlink();
    setGender(nextGender);
    try {
      await fetch("/api/user/gender", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: nextGender }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={handleFlip}
      onKeyDown={handleFlipKeyDown}
    >
      <div className={styles.header}>
        <span className={styles.headerTitle}>Cartão do Treinador</span>
        <StarIcon className={styles.headerStar} />
      </div>

      {!flipped ? (
        <>
          <div className={styles.body}>
            <div className={styles.stats}>
              <div className={styles.statRow}>
                <span>Nº ID</span>
                <span>{trainerId}</span>
              </div>
              <div className={styles.statRow}>
                <span>Nome</span>
                <span className={styles.statName}>{name}</span>
              </div>
              <div className={styles.statRow}>
                <span>Pokédex</span>
                <span>{percent}%</span>
              </div>
              <div className={styles.statRow}>
                <span>Score</span>
                <span>{score}</span>
              </div>
            </div>

            <div className={styles.spriteWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element -- sprite estático local do treinador */}
              <img src={SPRITES[gender]} alt="" className={styles.sprite} />
              <div className={styles.genderToggle}>
                <button
                  type="button"
                  className={`${styles.genderButton} ${gender === "male" ? styles.genderButtonActive : ""}`}
                  onClick={(event) => handleGenderChange(event, "male")}
                  aria-label="Treinador"
                >
                  ♂
                </button>
                <button
                  type="button"
                  className={`${styles.genderButton} ${gender === "female" ? styles.genderButtonActive : ""}`}
                  onClick={(event) => handleGenderChange(event, "female")}
                  aria-label="Treinadora"
                >
                  ♀
                </button>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <span>
              Dias de jornada: <strong>{daysSinceStart}</strong>
            </span>
            <span>
              Início: <strong>{startDate}</strong>
            </span>
          </div>
        </>
      ) : (
        <div className={styles.backBody}>
          <p className={styles.backText}>
            Sua jornada Pokémon começou em {startDate} e já dura {daysSinceStart}{" "}
            {daysSinceStart === 1 ? "dia" : "dias"}.
          </p>
        </div>
      )}

      <p className={styles.hint}>Toque no cartão para virar</p>
    </div>
  );
}
