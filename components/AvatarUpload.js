"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AvatarUpload.module.css";
import { UserIcon } from "./icons";

const AVATAR_SIZE = 400;
const JPEG_QUALITY = 0.85;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Recorta um quadrado central e redimensiona pro tamanho fixo do avatar antes de
// enviar — evita mandar a foto inteira da câmera (vários MB) pro banco.
async function cropAndResize(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const cropSize = Math.min(img.width, img.height);
    const sx = (img.width - cropSize) / 2;
    const sy = (img.height - cropSize) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    canvas
      .getContext("2d")
      .drawImage(img, sx, sy, cropSize, cropSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function AvatarUpload({ avatar }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(avatar);
  const [uploading, setUploading] = useState(false);

  // O avatar também pode mudar por fora (ex: escolher um Pokémon favorito). Em vez de
  // useEffect, ajusta o estado durante a renderização quando o prop muda (padrão do React).
  const [lastAvatarProp, setLastAvatarProp] = useState(avatar);
  if (avatar !== lastAvatarProp) {
    setLastAvatarProp(avatar);
    setPreview(avatar);
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await cropAndResize(file);
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: dataUrl }),
      });

      if (response.ok) {
        setPreview(dataUrl);
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.avatar}
      onClick={() => inputRef.current?.click()}
      aria-label="Alterar foto de perfil"
      disabled={uploading}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto do usuário salva como data URL no Mongo
        <img src={preview} alt="" className={styles.avatarImage} />
      ) : (
        <UserIcon />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
    </button>
  );
}
