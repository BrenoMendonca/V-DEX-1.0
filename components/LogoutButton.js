"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./LogoutButton.module.css";
import { playPlink } from "@/lib/sfx";

export default function LogoutButton() {
  const router = useRouter();

  const handleClick = async () => {
    playPlink();
    await signOut({ redirect: false });
    router.refresh();
  };

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      Sair
    </button>
  );
}
