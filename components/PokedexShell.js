"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./PokedexShell.module.css";
import { CameraIcon, PokeballIcon, UserIcon, GameControllerIcon, PawIcon, SunIcon, MoonIcon } from "./icons";
import { useTheme } from "@/lib/useTheme";
import { playPlink } from "@/lib/sfx";
import Onboarding from "./Onboarding";
import AuthForm from "./AuthForm";

const SCAN_TAB = { href: "/", label: "Escanear", Icon: CameraIcon, tour: "nav-scan" };

const KEY_TABS = [
  { href: "/capturados", label: "Pokédex", Icon: PokeballIcon, tour: "nav-dex" },
  { href: "/perfil", label: "Perfil", Icon: UserIcon, tour: "nav-profile" },
  { href: "/jogos", label: "Mini-jogos", Icon: GameControllerIcon, tour: "nav-games" },
  { href: "/pet", label: "Pet", Icon: PawIcon, tour: "nav-pet" },
];

export function emitTabReset(href) {
  window.dispatchEvent(new CustomEvent("pokedex:tab-reset", { detail: { href } }));
}

// Disparado pelo AuthForm só no fluxo de "Criar conta" — login numa conta existente nunca deve reabrir o onboarding.
export function emitJustRegistered(name) {
  window.dispatchEvent(new CustomEvent("pokedex:just-registered", { detail: { name } }));
}

// Disparado pelo PokemonScanner quando uma captura é confirmada — o Rotom companion reage.
export function emitCaptured(pokemon) {
  window.dispatchEvent(new CustomEvent("pokedex:captured", { detail: { pokemon } }));
}

// Disparado pelos botões do D-pad — páginas com navegação Anterior/Próximo (ex: CapturedDex) escutam.
export function emitDpadPress(direction) {
  window.dispatchEvent(new CustomEvent("pokedex:dpad", { detail: { direction } }));
}

// Disparado pelo PokemonScanner enquanto identifica uma carta — pisca os LEDs do device.
export function emitScanLoading(loading) {
  window.dispatchEvent(new CustomEvent("pokedex:scan-loading", { detail: { loading } }));
}

export default function PokedexShell({ children }) {
  const pathname = usePathname();
  const { status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deviceKey, setDeviceKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [ledActive, setLedActive] = useState(false);

  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    const handleJustRegistered = (event) => {
      setOnboardingName(event.detail?.name ?? "");
      setShowOnboarding(true);
    };
    window.addEventListener("pokedex:just-registered", handleJustRegistered);
    return () => window.removeEventListener("pokedex:just-registered", handleJustRegistered);
  }, []);

  useEffect(() => {
    const handleScanLoading = (event) => setLedActive(Boolean(event.detail?.loading));
    window.addEventListener("pokedex:scan-loading", handleScanLoading);
    return () => window.removeEventListener("pokedex:scan-loading", handleScanLoading);
  }, []);

  const handleTabClick = (event, href, active) => {
    playPlink();
    if (active) {
      event.preventDefault();
      emitTabReset(href);
    }
  };

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
          <div className={styles.screenContent}>
            {isAuthenticated ? children : status === "loading" ? null : <AuthForm />}
          </div>
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

        {isAuthenticated && (
        <nav className={styles.navBar}>
          <Link
            href={SCAN_TAB.href}
            data-tour={SCAN_TAB.tour}
            onClick={(event) => handleTabClick(event, SCAN_TAB.href, pathname === SCAN_TAB.href)}
            className={`${styles.navScan} ${pathname === SCAN_TAB.href ? styles.navScanActive : ""}`}
            aria-label={SCAN_TAB.label}
          >
            <SCAN_TAB.Icon />
          </Link>

          <div className={styles.navKeypad}>
            {KEY_TABS.map(({ href, label, Icon, tour }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-tour={tour}
                  onClick={(event) => handleTabClick(event, href, active)}
                  className={`${styles.keyButton} ${active ? styles.keyButtonActive : ""}`}
                  aria-label={label}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        )}
      </div>

      {showOnboarding && (
        <Onboarding name={onboardingName} onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
