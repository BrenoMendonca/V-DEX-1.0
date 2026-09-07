"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ProfileView.module.css";
import FavoritePokemonPicker from "./FavoritePokemonPicker";

export default function FavoritePokemonCard({ favoritePokemon }) {
  const router = useRouter();
  const [value, setValue] = useState(favoritePokemon);
  const [saving, setSaving] = useState(false);

  const handleChange = async (pokemon) => {
    setValue(pokemon);
    if (!pokemon) return;

    setSaving(true);
    try {
      await fetch("/api/user/favorite-pokemon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoritePokemonId: pokemon.id }),
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <p className={styles.sectionTitle}>Pokémon favorito</p>
      <FavoritePokemonPicker value={value} onChange={handleChange} compact />
      {saving && <p className={styles.empty}>Salvando...</p>}
    </div>
  );
}
