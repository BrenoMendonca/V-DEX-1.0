"use client";

import { useRef, useState } from "react";
import styles from "./PokemonAsk.module.css";
import { MicIcon, QuestionIcon, SpeakerIcon } from "./icons";
import RotomCompanion from "./RotomCompanion";
import { playPlink } from "@/lib/sfx";
import { speakText, stopSpeaking } from "@/lib/speech";

const MAX_QUESTION_LENGTH = 200;

const ERROR_MESSAGES = {
  rate_limited: "Muitas perguntas em pouco tempo — espera um pouco e tenta de novo.",
  question_too_long: "Pergunta muito longa, tenta resumir.",
  missing_question: "Escreve uma pergunta antes de enviar.",
  invalid_audio: "Não consegui ler o áudio gravado.",
  audio_too_large: "Áudio muito longo, tenta uma pergunta mais curta.",
  could_not_transcribe: "Não consegui entender o áudio. Tenta falar de novo ou digitar a pergunta.",
};

const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return RECORDER_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? "";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Recebe key={pokemon.id} de quem renderiza — remonta (e reseta o estado) sozinho ao trocar de
// Pokémon, sem precisar de um efeito só pra isso.
export default function PokemonAsk({ pokemon }) {
  const [question, setQuestion] = useState("");
  // Só a última pergunta/resposta — não deixa o card crescer indefinidamente a cada pergunta.
  const [lastExchange, setLastExchange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    playPlink();
    stopSpeaking();
    setSpeaking(false);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pokemon/${pokemon.name}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Não consegui responder agora. Tenta de novo.");
        return;
      }

      setLastExchange({ question: trimmed, answer: data.answer, onTopic: data.onTopic });
      setQuestion("");
    } catch (err) {
      console.error(err);
      setError("Não consegui responder agora. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const submitAudio = async (blob) => {
    stopSpeaking();
    setSpeaking(false);
    setLoading(true);
    setError(null);

    try {
      const audioBase64 = await blobToDataUrl(blob);
      const response = await fetch(`/api/pokemon/${pokemon.name}/ask-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64 }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Não consegui responder agora. Tenta de novo.");
        return;
      }

      setLastExchange({ question: data.question, answer: data.answer, onTopic: data.onTopic });
    } catch (err) {
      console.error(err);
      setError("Não consegui responder agora. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  };

  const handleMicClick = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    if (loading) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Gravação de áudio não é suportada neste navegador.");
      return;
    }

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopStream();
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size > 0) {
          submitAudio(blob);
        }
      };

      recorderRef.current = recorder;
      playPlink();
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      setError("Não consegui acessar o microfone. Verifica a permissão do navegador.");
      stopStream();
    }
  };

  const handleToggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    speakText(lastExchange.answer, { onEnd: () => setSpeaking(false) }).catch((err) => {
      console.error(err);
      setSpeaking(false);
    });
  };

  return (
    <div className={styles.wrap}>
      <RotomCompanion />
      <div className={styles.header}>
        <QuestionIcon className={styles.headerIcon} />
        <p className={styles.headerTitle}>Pergunte à Pokédex!</p>
      </div>

      {lastExchange && (
        <div className={styles.exchange}>
          <p className={styles.question}>{lastExchange.question}</p>
          <div className={styles.answerRow}>
            <p className={`${styles.answer} ${lastExchange.onTopic === false ? styles.answerOffTopic : ""}`}>
              {lastExchange.answer}
            </p>
            <button
              type="button"
              className={`${styles.speakButton} ${speaking ? styles.speakButtonActive : ""}`}
              onClick={handleToggleSpeak}
              aria-label={speaking ? "Parar áudio da resposta" : "Ouvir resposta"}
            >
              <SpeakerIcon className={styles.speakIcon} />
            </button>
          </div>
        </div>
      )}

      {recording && <p className={styles.recordingLabel}>🔴 Gravando... toque no microfone pra parar</p>}
      {error && <p className={styles.error}>{error}</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder={`Pergunte algo sobre ${pokemon.name.replace(/-/g, " ")}...`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={loading || recording}
        />
        <button
          type="button"
          className={`${styles.micButton} ${recording ? styles.micButtonRecording : ""}`}
          onClick={handleMicClick}
          disabled={loading && !recording}
          aria-label={recording ? "Parar gravação" : "Perguntar por áudio"}
        >
          <MicIcon className={styles.micIcon} />
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading || recording || !question.trim()}
        >
          {loading ? "..." : "Perguntar"}
        </button>
      </form>
    </div>
  );
}
