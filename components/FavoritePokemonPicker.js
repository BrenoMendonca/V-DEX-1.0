"use client";

import { useMemo, useState } from "react";
import styles from "./FavoritePokemonPicker.module.css";
import FallbackImage from "./FallbackImage";
import PokemonDetail from "./PokemonDetail";
import { defaultSpriteUrl } from "@/lib/sprites";
import { POKEMON_LIST } from "@/lib/pokemonList";

const MAX_SUGGESTIONS = 6;

export default function FavoritePokemonPicker({ value, onChange, compact = false }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const isNumeric = /^\d+$/.test(trimmed);
    return POKEMON_LIST.filter((p) =>
      isNumeric ? String(p.id).startsWith(trimmed) : p.name.includes(trimmed)
    ).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  const handlePick = async (id) => {
    setQuery("");
    setLoading(true);
    try {
      const response = await fetch(`/api/pokemon/${id}`);
      if (!response.ok) return;
      const data = await response.json();
      onChange(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Carregando...</p>;
  }

  if (value && compact) {
    return (
      <div className={styles.selected}>
        <FallbackImage
          sources={[defaultSpriteUrl(value.id)]}
          alt=""
          className={styles.selectedSprite}
        />
        <span className={styles.selectedName}>{value.name}</span>
        <button type="button" className={styles.changeButton} onClick={() => onChange(null)}>
          Trocar
        </button>
      </div>
    );
  }

  if (value) {
    return (
      <div className={styles.selectedWrap}>
        <PokemonDetail pokemon={value} />
        <button type="button" className={styles.changeButton} onClick={() => onChange(null)}>
          Trocar Pokémon favorito
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <input
        type="search"
        className={styles.input}
        placeholder="Nome ou número do Pokémon"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {suggestions.length > 0 && (
        <ul className={styles.suggestions}>
          {suggestions.map((p) => (
            <li key={p.id}>
              <button type="button" className={styles.suggestionItem} onClick={() => handlePick(p.id)}>
                <FallbackImage
                  sources={[defaultSpriteUrl(p.id)]}
                  alt=""
                  className={styles.suggestionSprite}
                />
                <span className={styles.suggestionName}>{p.name}</span>
                <span className={styles.suggestionNumber}>#{p.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
