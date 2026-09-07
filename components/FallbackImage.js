"use client";

import { useState } from "react";

export default function FallbackImage({ sources, alt, className }) {
  const [index, setIndex] = useState(0);

  if (index >= sources.length) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- sprite dinâmico da PokeAPI com fallback em cascata entre URLs
    <img
      src={sources[index]}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
