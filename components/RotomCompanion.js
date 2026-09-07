"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RotomCompanion.module.css";
import FallbackImage from "./FallbackImage";
import { animatedSpriteUrl, officialArtworkUrl, defaultSpriteUrl } from "@/lib/sprites";

const ROTOM_ID = 479;

// Espia no canto do cartão "Pergunte à Pokédex" e reage quando uma captura acontece.
export default function RotomCompanion() {
  const [excited, setExcited] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleCaptured = () => {
      setExcited(false);
      const frame = requestAnimationFrame(() => setExcited(true));
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setExcited(false), 1300);
      return () => cancelAnimationFrame(frame);
    };

    window.addEventListener("pokedex:captured", handleCaptured);
    return () => {
      window.removeEventListener("pokedex:captured", handleCaptured);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={`${styles.wrap} ${excited ? styles.excited : ""}`}>
      <FallbackImage
        sources={[officialArtworkUrl(ROTOM_ID), animatedSpriteUrl("rotom"), defaultSpriteUrl(ROTOM_ID)]}
        alt=""
        className={styles.sprite}
      />
    </div>
  );
}
