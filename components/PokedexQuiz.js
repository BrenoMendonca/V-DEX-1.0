"use client";

import { useEffect, useState } from "react";
import styles from "./PokedexQuiz.module.css";
import FallbackImage from "./FallbackImage";
import { defaultSpriteUrl, officialArtworkUrl } from "@/lib/sprites";
import { playCaught, playPlink } from "@/lib/sfx";

const GAME_ID = "pokedex-quiz";

const VALUE_UNIT = {
  weight: (v) => `${(v / 10).toFixed(1)} kg`,
  height: (v) => `${(v / 10).toFixed(1)} m`,
};

export default function PokedexQuiz() {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const loadQuestion = async () => {
    setLoading(true);
    setAnswered(false);
    setSelectedIndex(null);
    try {
      const response = await fetch("/api/pokedex-quiz");
      const data = await response.json();
      setQuestion(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`/api/game-score?game=${GAME_ID}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setScore(data))
      .catch((error) => console.error(error));
    const timer = setTimeout(() => loadQuestion(), 0);
    return () => clearTimeout(timer);
  }, []);

  const submitScore = async (correct) => {
    try {
      const response = await fetch("/api/game-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: GAME_ID, correct }),
      });
      if (response.ok) setScore(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const handleAnswer = (index) => {
    if (answered || loading || !question) return;
    playPlink();
    setSelectedIndex(index);
    setAnswered(true);
    const isCorrect = question.options[index].isCorrect;
    if (isCorrect) playCaught();
    submitScore(isCorrect);
  };

  if (loading || !question) {
    return (
      <div className={styles.wrap}>
        <p className={styles.loadingText}>Preparando pergunta...</p>
      </div>
    );
  }

  const isComparison = question.type === "weight" || question.type === "height";

  return (
    <div className={styles.wrap}>
      <div className={styles.scoreRow}>
        <span>
          Acertos: {score.correct}/{score.total}
        </span>
      </div>

      <p className={styles.question}>{question.question}</p>

      {!isComparison && question.targetId && (
        <div className={styles.targetBox}>
          <FallbackImage
            sources={[officialArtworkUrl(question.targetId), defaultSpriteUrl(question.targetId)]}
            alt={question.targetName}
            className={styles.targetSprite}
          />
          <p className={styles.targetName}>{question.targetName.replace(/-/g, " ")}</p>
        </div>
      )}

      {isComparison ? (
        <div className={styles.comparisonRow}>
          {question.options.map((option, index) => {
            const stateClass = answered
              ? option.isCorrect
                ? styles.optionCorrect
                : selectedIndex === index
                  ? styles.optionWrong
                  : ""
              : "";
            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.comparisonOption} ${stateClass}`}
                onClick={() => handleAnswer(index)}
                disabled={answered}
              >
                <FallbackImage
                  sources={[defaultSpriteUrl(option.id)]}
                  alt={option.name}
                  className={styles.comparisonSprite}
                />
                <span className={styles.comparisonName}>{option.name.replace(/-/g, " ")}</span>
                {answered && (
                  <span className={styles.comparisonValue}>{VALUE_UNIT[question.type](option.value)}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.choiceList}>
          {question.options.map((option, index) => {
            const stateClass = answered
              ? option.isCorrect
                ? styles.choiceCorrect
                : selectedIndex === index
                  ? styles.choiceWrong
                  : ""
              : "";
            return (
              <button
                key={option.text}
                type="button"
                className={`${styles.choiceOption} ${stateClass}`}
                onClick={() => handleAnswer(index)}
                disabled={answered}
              >
                {option.text}
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <button type="button" className={styles.nextButton} onClick={loadQuestion}>
          Próxima pergunta
        </button>
      )}
    </div>
  );
}
