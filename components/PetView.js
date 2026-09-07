"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PetView.module.css";
import FallbackImage from "./FallbackImage";
import FavoritePokemonPicker from "./FavoritePokemonPicker";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";
import { playPlink, playCaught } from "@/lib/sfx";

const ERROR_MESSAGES = {
  already_full: "Já está satisfeito!",
  already_happy: "Já está super feliz!",
  too_tired: "Está cansado demais pra brincar.",
  pet_sleeping: "Está dormindo agora.",
  already_sleeping: "Já está dormindo.",
  not_tired: "Não está cansado, não precisa dormir.",
  not_sleeping: "Não está dormindo.",
};

function StatBar({ label, value }) {
  return (
    <div className={styles.statRow}>
      <div className={styles.statHeader}>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className={styles.statTrack}>
        <div
          className={`${styles.statFill} ${value < 25 ? styles.statFillLow : ""}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function PetView({ pokemon, initialPet }) {
  const router = useRouter();
  const [favoriteValue, setFavoriteValue] = useState(pokemon);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [pet, setPet] = useState(initialPet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFavoriteChange = async (picked) => {
    setFavoriteValue(picked);
    if (!picked) return;

    setSavingFavorite(true);
    try {
      await fetch("/api/user/favorite-pokemon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoritePokemonId: picked.id }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFavorite(false);
    }
  };

  const handleAction = async (action) => {
    if (loading) return;
    playPlink();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Não foi possível fazer isso agora.");
        return;
      }

      if (action === "feed" || action === "play") {
        playCaught();
      }
      setPet(data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível fazer isso agora.");
    } finally {
      setLoading(false);
    }
  };

  if (!favoriteValue) {
    return (
      <div className={styles.wrap}>
        <p className={styles.promptTitle}>Escolha seu Pokémon favorito</p>
        <p className={styles.promptSubtitle}>
          Seu pet virtual é o seu Pokémon favorito — escolha um pra começar a cuidar dele.
        </p>
        <FavoritePokemonPicker value={favoriteValue} onChange={handleFavoriteChange} />
        {savingFavorite && <p className={styles.saving}>Salvando...</p>}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={`${styles.spriteWrap} ${pet.isSleeping ? styles.spriteSleeping : ""}`}>
          <FallbackImage
            sources={[
              animatedSpriteUrl(favoriteValue.name),
              officialArtworkUrl(favoriteValue.id),
              defaultSpriteUrl(favoriteValue.id),
            ]}
            alt={favoriteValue.name}
            className={styles.sprite}
          />
          {pet.isSleeping && <span className={styles.zzz}>💤</span>}
        </div>
        <p className={styles.name}>{favoriteValue.name.replace(/-/g, " ")}</p>
        <div className={styles.levelRow}>
          <span className={styles.levelBadge}>Nv. {pet.level}</span>
          <div className={styles.xpTrack}>
            <div className={styles.xpFill} style={{ width: `${pet.xp % 100}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <StatBar label="Fome" value={pet.hunger} />
        <StatBar label="Felicidade" value={pet.happiness} />
        <StatBar label="Energia" value={pet.energy} />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => handleAction("feed")}
          disabled={loading || pet.isSleeping || pet.hunger >= 100}
        >
          🍎 Alimentar
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => handleAction("play")}
          disabled={loading || pet.isSleeping || pet.happiness >= 100 || pet.energy <= 0}
        >
          🎾 Brincar
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => handleAction(pet.isSleeping ? "wake" : "sleep")}
          disabled={loading || (!pet.isSleeping && pet.energy >= 100)}
        >
          {pet.isSleeping ? "☀️ Acordar" : "🌙 Dormir"}
        </button>
      </div>
    </div>
  );
}
