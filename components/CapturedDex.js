"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CapturedDex.module.css";
import FallbackImage from "./FallbackImage";
import PokemonDetail from "./PokemonDetail";
import { officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";
import { GENERATIONS } from "@/lib/generations";
import { POKEMON_TYPES } from "@/lib/pokemonTypes";
import { POKEMON_LIST } from "@/lib/pokemonList";

const MAX_SUGGESTIONS = 8;

export default function CapturedDex({ capturedIds, dexCount }) {
  const capturedSet = useMemo(() => new Set(capturedIds), [capturedIds]);
  const dexIds = useMemo(() => Array.from({ length: dexCount }, (_, i) => i + 1), [dexCount]);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const cacheRef = useRef(new Map());
  const topRef = useRef(null);

  const [searchValue, setSearchValue] = useState("");
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handleReset = (event) => {
      if (event.detail?.href !== "/capturados") return;
      setSelectedId(null);
      setSelectedPokemon(null);
      setSearchValue("");
      setSearchNotFound(false);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.addEventListener("pokedex:tab-reset", handleReset);
    return () => window.removeEventListener("pokedex:tab-reset", handleReset);
  }, []);

  const [generationId, setGenerationId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [typeIds, setTypeIds] = useState(null);
  const [typeLoading, setTypeLoading] = useState(false);
  const typeCacheRef = useRef(new Map());

  useEffect(() => {
    if (!typeFilter) {
      return;
    }

    const cached = typeCacheRef.current.get(typeFilter);
    if (cached) {
      setTypeIds(cached);
      return;
    }

    let cancelled = false;
    setTypeLoading(true);

    fetch(`/api/pokemon-type/${typeFilter}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const ids = new Set(data.ids ?? []);
        typeCacheRef.current.set(typeFilter, ids);
        setTypeIds(ids);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setTypeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [typeFilter]);

  const selectedGeneration = GENERATIONS.find((g) => String(g.id) === generationId);

  const filteredIds = useMemo(() => {
    return dexIds.filter((id) => {
      if (selectedGeneration && (id < selectedGeneration.from || id > selectedGeneration.to)) {
        return false;
      }
      if (typeFilter && typeIds && !typeIds.has(id)) {
        return false;
      }
      return true;
    });
  }, [dexIds, selectedGeneration, typeFilter, typeIds]);

  const filteredCapturedCount = useMemo(
    () => filteredIds.filter((id) => capturedSet.has(id)).length,
    [filteredIds, capturedSet]
  );

  const hasActiveFilters = Boolean(generationId || typeFilter);

  const suggestions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return [];
    const isNumeric = /^\d+$/.test(query);
    return POKEMON_LIST.filter((p) =>
      isNumeric ? String(p.id).startsWith(query) : p.name.includes(query)
    ).slice(0, MAX_SUGGESTIONS);
  }, [searchValue]);

  const handleSelect = async (query) => {
    setSelectedId(query);
    setSearchNotFound(false);
    setShowSuggestions(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    const cached = cacheRef.current.get(query);
    if (cached) {
      setSelectedPokemon(cached);
      return;
    }

    setSelectedPokemon(null);
    setLoadingId(query);

    try {
      const response = await fetch(`/api/pokemon/${query}`);
      if (response.status === 404) {
        setSelectedId(null);
        setSearchNotFound(true);
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      cacheRef.current.set(query, data);
      cacheRef.current.set(data.id, data);
      setSelectedId(data.id);
      setSelectedPokemon(data);
    } catch (error) {
      console.error(error);
      setSearchNotFound(true);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchValue.trim().toLowerCase();
    if (!query) return;
    handleSelect(query);
    setSearchValue("");
  };

  const handleSuggestionPick = (id) => {
    setSearchValue("");
    handleSelect(id);
  };

  const handleBack = () => {
    setSelectedId(null);
    setSelectedPokemon(null);
    setSearchNotFound(false);
  };

  const handlePrev = () => {
    if (typeof selectedId === "number" && selectedId > 1) {
      handleSelect(selectedId - 1);
    }
  };

  const handleNext = () => {
    if (typeof selectedId === "number" && selectedId < dexCount) {
      handleSelect(selectedId + 1);
    }
  };

  // D-pad do device (decoração até agora) — navega Anterior/Próximo quando um Pokémon
  // está selecionado, igual aos botões que já existem na tela.
  useEffect(() => {
    const handleDpad = (event) => {
      if (typeof selectedId !== "number" || loadingId) return;
      const direction = event.detail?.direction;
      if (direction === "prev" && selectedId > 1) handleSelect(selectedId - 1);
      if (direction === "next" && selectedId < dexCount) handleSelect(selectedId + 1);
    };
    window.addEventListener("pokedex:dpad", handleDpad);
    return () => window.removeEventListener("pokedex:dpad", handleDpad);
  }, [selectedId, loadingId, dexCount]);

  const clearFilters = () => {
    setGenerationId("");
    setTypeFilter("");
  };

  return (
    <>
      <div ref={topRef} />

      {!selectedId ? (
        <>
          <div className={styles.searchWrap}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Nome ou número"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                required
              />
              <button type="submit" className={styles.searchButton}>
                Buscar
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={styles.suggestionItem}
                      onMouseDown={() => handleSuggestionPick(s.id)}
                    >
                      <FallbackImage
                        sources={[defaultSpriteUrl(s.id)]}
                        alt=""
                        className={styles.suggestionSprite}
                      />
                      <span className={styles.suggestionName}>{s.name}</span>
                      <span className={styles.suggestionNumber}>#{s.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {searchNotFound && <p className={styles.detailPlaceholder}>Pokémon não encontrado :(</p>}

          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={generationId}
              onChange={(event) => setGenerationId(event.target.value)}
            >
              <option value="">Todas as gerações</option>
              {GENERATIONS.map((gen) => (
                <option key={gen.id} value={gen.id}>
                  {gen.label}
                </option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Todos os tipos</option>
              {POKEMON_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button type="button" className={styles.clearButton} onClick={clearFilters}>
                Limpar
              </button>
            )}
          </div>

          <p className={styles.count}>
            {hasActiveFilters
              ? `${filteredCapturedCount} de ${filteredIds.length} capturados (filtrado)`
              : `${capturedSet.size} de ${dexCount} capturados`}
          </p>
        </>
      ) : (
        <div className={styles.detailNav}>
          <button type="button" className={styles.backButton} onClick={handleBack}>
            &lt; Voltar
          </button>
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={handlePrev}
              disabled={Boolean(loadingId) || selectedId <= 1}
            >
              &lt; Anterior
            </button>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={handleNext}
              disabled={Boolean(loadingId) || selectedId >= dexCount}
            >
              Próximo &gt;
            </button>
          </div>
        </div>
      )}

      <div>
        {!selectedId && (
          <p className={styles.detailPlaceholder}>Toque em um Pokémon para ver mais informações.</p>
        )}

        {selectedId && loadingId === selectedId && (
          <p className={styles.detailPlaceholder}>Carregando...</p>
        )}

        {selectedId && selectedPokemon && loadingId !== selectedId && (
          <PokemonDetail
            pokemon={selectedPokemon}
            capturedBadge={!capturedSet.has(selectedPokemon.id)}
            onNavigate={handleSelect}
          />
        )}
      </div>

      {!selectedId && (
        <>
          {typeFilter && typeLoading && <p className={styles.detailPlaceholder}>Filtrando por tipo...</p>}

          {!(typeFilter && typeLoading) && filteredIds.length === 0 && (
            <p className={styles.detailPlaceholder}>Nenhum Pokémon encontrado com esses filtros.</p>
          )}

          {!(typeFilter && typeLoading) && filteredIds.length > 0 && (
            <div className={styles.grid}>
              {filteredIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.cell} ${id === selectedId ? styles.cellSelected : ""}`}
                  onClick={() => handleSelect(id)}
                  aria-label={`Pokémon #${id}`}
                >
                  <span className={styles.cellNumber}>#{id}</span>
                  <FallbackImage
                    sources={[defaultSpriteUrl(id), officialArtworkUrl(id)]}
                    alt=""
                    className={styles.cellSprite}
                  />
                  {capturedSet.has(id) && <span className={styles.ball} />}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
