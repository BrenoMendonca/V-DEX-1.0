"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PokemonDetail.module.css";
import TypeBadge from "./TypeBadge";
import StatRadar from "./StatRadar";
import FallbackImage from "./FallbackImage";
import PokemonAsk from "./PokemonAsk";
import { officialArtworkUrl, defaultSpriteUrl, animatedSpriteUrl, itemSpriteUrl } from "@/lib/sprites";
import { typeBackground, TYPE_COLORS } from "@/lib/pokemonTypes";
import { eggGroupLabel } from "@/lib/eggGroups";
import { speakPokemonEntry, stopSpeaking } from "@/lib/speech";

function GenderRate({ genderRate }) {
  if (genderRate === null || genderRate === undefined) return null;
  if (genderRate === -1) return <span>Sem gênero</span>;

  const female = Math.round((genderRate / 8) * 100);
  const male = 100 - female;
  return (
    <span>
      ♂ {male}% · ♀ {female}%
    </span>
  );
}

function WeaknessBadges({ label, types }) {
  if (!types || types.length === 0) return null;

  return (
    <div className={styles.weaknessGroup}>
      <p className={styles.weaknessLabel}>{label}</p>
      <div className={styles.weaknessBadges}>
        {types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
    </div>
  );
}

export default function PokemonDetail({ pokemon, confidence, capturedBadge, autoSpeak, onNavigate }) {
  const [bouncing, setBouncing] = useState(false);
  const [speechState, setSpeechState] = useState("idle");
  const [activeTab, setActiveTab] = useState("sobre");
  const audioRef = useRef(null);

  useEffect(() => stopSpeaking, [pokemon.id]);

  const handleSpeakClick = async () => {
    if (speechState !== "idle") {
      stopSpeaking();
      setSpeechState("idle");
      return;
    }

    setSpeechState("loading");
    try {
      await speakPokemonEntry(pokemon, {
        onStart: () => setSpeechState("speaking"),
        onEnd: () => setSpeechState("idle"),
      });
    } catch (error) {
      console.error(error);
      setSpeechState("idle");
    }
  };

  useEffect(() => {
    if (!autoSpeak) return undefined;
    const timer = setTimeout(() => handleSpeakClick(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara só uma vez ao montar com um pokémon recém-escaneado
  }, [autoSpeak, pokemon.id]);

  const handleSpriteClick = () => {
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));

    if (pokemon.crySound) {
      if (!audioRef.current) {
        audioRef.current = new Audio(pokemon.crySound);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const primaryType = pokemon.types?.[0];
  const description = pokemon.flavorTextPt || pokemon.flavorText;
  const weaknesses = pokemon.weaknesses;

  return (
    <div className={styles.card} style={{ background: typeBackground(primaryType) }}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.spriteButton}
          onClick={handleSpriteClick}
          onAnimationEnd={() => setBouncing(false)}
          aria-label={`Tocar grito de ${pokemon.name}`}
        >
          <FallbackImage
            sources={[
              animatedSpriteUrl(pokemon.name),
              officialArtworkUrl(pokemon.id),
              defaultSpriteUrl(pokemon.id),
            ]}
            alt={pokemon.name}
            className={`${styles.sprite} ${bouncing ? styles.spriteBounce : ""}`}
          />
        </button>
        <div>
          <p className={styles.number}>#{pokemon.id}</p>
          <h2 className={styles.name}>{pokemon.name.replace(/-/g, " ")}</h2>
          {(pokemon.genusPt || pokemon.genus) && (
            <p className={styles.genus}>{pokemon.genusPt || pokemon.genus}</p>
          )}
          {typeof confidence === "number" && (
            <p className={styles.confidence}>{Math.round(confidence * 100)}% de confiança</p>
          )}
          {capturedBadge ? (
            <span className={styles.uncapturedTag}>Ainda não capturado</span>
          ) : (
            <span className={styles.capturedTag}>
              <FallbackImage
                sources={[itemSpriteUrl("poke-ball")]}
                alt=""
                className={styles.capturedTagIcon}
              />
              Capturado
            </span>
          )}
        </div>
      </div>

      <div className={styles.types}>
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "sobre" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("sobre")}
        >
          <FallbackImage sources={[itemSpriteUrl("poke-ball")]} alt="" className={styles.tabIcon} />
          Sobre
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "status" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("status")}
        >
          <FallbackImage sources={[itemSpriteUrl("poke-ball")]} alt="" className={styles.tabIcon} />
          Status
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "sobre" && (
          <>
            {description && (
              <>
                <p className={styles.flavorBox}>
                  {description}
                  {!pokemon.flavorTextPt && <span className={styles.flavorLang}>Descrição em inglês</span>}
                </p>
                <button type="button" className={styles.speakButton} onClick={handleSpeakClick}>
                  {speechState === "loading" && "Gerando voz..."}
                  {speechState === "speaking" && "Parar"}
                  {speechState === "idle" && "Ouvir Pokédex"}
                </button>
              </>
            )}

            <PokemonAsk key={pokemon.id} pokemon={pokemon} />
          </>
        )}

        {activeTab === "status" && (
          <>
            <div className={styles.metrics}>
              <span>Altura: {(pokemon.height / 10).toFixed(1)} m</span>
              <span>Peso: {(pokemon.weight / 10).toFixed(1)} kg</span>
              {typeof pokemon.captureRate === "number" && (
                <span>Captura: {pokemon.captureRate}/255</span>
              )}
              <GenderRate genderRate={pokemon.genderRate} />
            </div>

            {pokemon.eggGroups?.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Grupo de ovos</p>
                <p className={styles.metrics}>{pokemon.eggGroups.map(eggGroupLabel).join(", ")}</p>
              </div>
            )}

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Stats base</p>
              <StatRadar stats={pokemon.stats} color={TYPE_COLORS[primaryType] ?? "#ef4453"} />
            </div>

            {pokemon.abilitiesDetailed?.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Habilidades</p>
                {pokemon.abilitiesDetailed.map((ability) => (
                  <div key={ability.name} className={styles.abilityItem}>
                    <p className={styles.abilityName}>{ability.name.replace(/-/g, " ")}</p>
                    {ability.effect && <p className={styles.abilityEffect}>{ability.effect}</p>}
                  </div>
                ))}
              </div>
            )}

            {weaknesses && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Fraquezas e resistências</p>
                <WeaknessBadges label="Fraco (4x)" types={weaknesses.quadrupleWeak} />
                <WeaknessBadges label="Fraco (2x)" types={weaknesses.doubleWeak} />
                <WeaknessBadges label="Resiste (1/2x)" types={weaknesses.halfResist} />
                <WeaknessBadges label="Resiste (1/4x)" types={weaknesses.quarterResist} />
                <WeaknessBadges label="Imune" types={weaknesses.immune} />
              </div>
            )}
          </>
        )}
      </div>

      {pokemon.varieties?.length > 1 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Outras formas</p>
          <div className={styles.evolutionRow}>
            {pokemon.varieties.map((variety) => {
              const isCurrent = variety.id === pokemon.id;
              const canNavigate = Boolean(onNavigate) && !isCurrent;
              const VarietyTag = canNavigate ? "button" : "div";

              return (
                <VarietyTag
                  key={variety.id}
                  type={canNavigate ? "button" : undefined}
                  className={`${styles.evolutionStage} ${isCurrent ? styles.evolutionStageCurrent : ""}`}
                  onClick={canNavigate ? () => onNavigate(variety.id) : undefined}
                >
                  <FallbackImage
                    sources={[defaultSpriteUrl(variety.id), officialArtworkUrl(variety.id)]}
                    alt={variety.label}
                    className={styles.evolutionSprite}
                  />
                  <span className={styles.evolutionName}>{variety.label}</span>
                </VarietyTag>
              );
            })}
          </div>
        </div>
      )}

      {pokemon.evolutionChain?.length > 1 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Cadeia de evolução</p>
          <div className={styles.evolutionRow}>
            {pokemon.evolutionChain.map((stage, index) => {
              const isCurrent = stage.id === pokemon.id;
              const canNavigate = Boolean(onNavigate) && !isCurrent;
              const StageTag = canNavigate ? "button" : "div";

              return (
                <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {index > 0 && <span className={styles.evolutionArrow}>→</span>}
                  <StageTag
                    type={canNavigate ? "button" : undefined}
                    className={`${styles.evolutionStage} ${isCurrent ? styles.evolutionStageCurrent : ""}`}
                    onClick={canNavigate ? () => onNavigate(stage.id) : undefined}
                  >
                    <FallbackImage
                      sources={[defaultSpriteUrl(stage.id), officialArtworkUrl(stage.id)]}
                      alt={stage.name}
                      className={styles.evolutionSprite}
                    />
                    <span className={styles.evolutionName}>{stage.name}</span>
                    {stage.trigger && <span className={styles.evolutionTrigger}>{stage.trigger}</span>}
                  </StageTag>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
