"use client";

import { useEffect, useState } from "react";
import styles from "./PokedexShell.module.css";
import { PokeballIcon, SunIcon, MoonIcon } from "./icons";
import { useTheme } from "@/lib/useTheme";
import { playPlink } from "@/lib/sfx";
import Onboarding, { hasSeenOnboarding } from "./Onboarding";

// Disparado pelo PokemonScanner quando uma captura é confirmada — o Rotom companion (dentro do
// Pergunte à Pokédex) reage.
export function emitCaptured(pokemon) {
  window.dispatchEvent(new CustomEvent("pokedex:captured", { detail: { pokemon } }));
}

// Disparado pelos botões do D-pad — decorativo nessa variante (nenhuma tela ouve hoje).
export function emitDpadPress(direction) {
  window.dispatchEvent(new CustomEvent("pokedex:dpad", { detail: { direction } }));
}

// Disparado pelo PokemonScanner enquanto identifica uma carta — pisca os LEDs do device.
export function emitScanLoading(loading) {
  window.dispatchEvent(new CustomEvent("pokedex:scan-loading", { detail: { loading } }));
}

export default function PokedexShell({ children }) {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deviceKey, setDeviceKey] = useState(0);
  const [ledActive, setLedActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSeenOnboarding()) {
        setShowOnboarding(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScanLoading = (event) => setLedActive(Boolean(event.detail?.loading));
    window.addEventListener("pokedex:scan-loading", handleScanLoading);
    return () => window.removeEventListener("pokedex:scan-loading", handleScanLoading);
  }, []);

  const handleDpadPress = (direction) => {
    playPlink();
    emitDpadPress(direction);
  };

  const handleOpenClick = () => {
    playPlink();
    setDeviceKey((key) => key + 1);
    setIsOpen(true);
  };

  const handleLensClick = () => {
    playPlink();
    if (!closing) {
      setClosing(true);
    }
  };

  const handleThemeToggle = () => {
    playPlink();
    toggleTheme();
  };

  const handleDeviceAnimationEnd = () => {
    if (closing) {
      setClosing(false);
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <div className={styles.appContainer}>
        <button
          type="button"
          className={styles.closedCover}
          onClick={handleOpenClick}
          aria-label="Abrir a Pokédex"
        >
          <PokeballIcon className={styles.closedBall} />
          <span className={styles.closedHint}>Toque para abrir</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <div
        key={deviceKey}
        className={`${styles.device} ${closing ? styles.deviceClosing : ""}`}
        onAnimationEnd={handleDeviceAnimationEnd}
      >
        <div className={styles.headerWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático local, não precisa de otimização do next/image */}
          <img src="/Images/header.svg" alt="" className={styles.headerImage} aria-hidden="true" />
          <button
            type="button"
            className={styles.lensHit}
            onClick={handleLensClick}
            aria-label="Fechar a Pokédex"
          />
        </div>

        <div className={styles.screen}>
          <div className={styles.screenContent}>{children}</div>
        </div>

        <div className={styles.controlStrip}>
          <div className={styles.dpad}>
            <button
              type="button"
              className={styles.dpadUp}
              onClick={() => handleDpadPress("prev")}
              aria-label="Anterior"
            />
            <button
              type="button"
              className={styles.dpadDown}
              onClick={() => handleDpadPress("next")}
              aria-label="Próximo"
            />
            <button
              type="button"
              className={styles.dpadLeft}
              onClick={() => handleDpadPress("prev")}
              aria-label="Anterior"
            />
            <button
              type="button"
              className={styles.dpadRight}
              onClick={() => handleDpadPress("next")}
              aria-label="Próximo"
            />
          </div>
          <span className={`${styles.ledStrip} ${ledActive ? styles.ledStripActive : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <button
            type="button"
            className={styles.speaker}
            onClick={handleThemeToggle}
            aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            suppressHydrationWarning
          >
            <SunIcon className={styles.iconSun} />
            <MoonIcon className={styles.iconMoon} />
          </button>
        </div>
      </div>

      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
}
