"use client";

import { useState } from "react";
import styles from "./PokemonScanner.module.css";
import PokemonDetail from "./PokemonDetail";
import CaptureReveal from "./CaptureReveal";
import { emitCaptured, emitScanLoading } from "./PokedexShell";

const STATUS_MESSAGES = {
  not_identified: "Não conseguimos identificar essa carta. Tente com mais luz e foco.",
  rate_limited: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  error: "Algo deu errado ao identificar a carta. Tente novamente.",
};

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Fotos de câmera de celular costumam vir com vários MB em resolução total — isso pesa
// tanto no upload quanto no tempo de processamento do Gemini. Redimensionar no client antes
// de enviar é o maior ganho de latência disponível sem tocar no backend.
async function resizeImageFile(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function PokemonScanner() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setResult(null);
    setPendingResult(null);
    setStatusMessage(null);
    setLoading(true);
    emitScanLoading(true);

    const dataUrl = await resizeImageFile(file);
    setPreviewUrl(dataUrl);

    try {
      const response = await fetch("/api/scan-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });

      const data = await response.json();

      if (data.status === "identified") {
        setPendingResult(data);
      } else {
        setStatusMessage(STATUS_MESSAGES[data.status] ?? STATUS_MESSAGES.error);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(STATUS_MESSAGES.error);
    } finally {
      setLoading(false);
      emitScanLoading(false);
    }
  };

  const handleRevealDone = () => {
    setResult(pendingResult);
    if (pendingResult?.pokemon) {
      emitCaptured(pendingResult.pokemon);
    }
    setPendingResult(null);
  };

  // Sem banco pra guardar capturas, mas dá pra tocar numa evolução/outra forma e ver os dados
  // dela na hora, sem precisar escanear de novo.
  const handleNavigate = async (id) => {
    try {
      const response = await fetch(`/api/pokemon/${id}`);
      if (!response.ok) return;
      const pokemon = await response.json();
      setResult((prev) => (prev ? { ...prev, pokemon, confidence: undefined } : prev));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {!result ? (
        <div className={styles.preview}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview local do arquivo capturado, não vem de URL remota otimizável
            <img src={previewUrl} alt="Foto capturada" className={styles.previewImage} />
          ) : (
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon} />
              Aponte a câmera para uma carta de Pokémon
            </div>
          )}

          {loading && (
            <div className={styles.overlay}>
              <span className={styles.spinner} />
              Identificando carta...
            </div>
          )}

          {!loading && statusMessage && <div className={styles.overlay}>{statusMessage}</div>}

          {pendingResult && (
            <CaptureReveal pokemon={pendingResult.pokemon} onDone={handleRevealDone} />
          )}
        </div>
      ) : (
        <div className={styles.resultHeader}>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura local do arquivo capturado
            <img src={previewUrl} alt="Foto capturada" className={styles.resultThumb} />
          )}
          <p className={styles.resultHeaderLabel}>Identificado!</p>
        </div>
      )}

      <label
        className={`${styles.captureButton} ${result ? styles.captureButtonCompact : ""} ${
          loading ? styles.captureButtonDisabled : ""
        }`}
      >
        {loading ? "Identificando..." : previewUrl ? "Escanear outra carta" : "Escanear carta"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className={styles.hiddenInput}
          disabled={loading}
        />
      </label>

      {result && (
        <PokemonDetail
          pokemon={result.pokemon}
          confidence={result.confidence}
          autoSpeak
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
