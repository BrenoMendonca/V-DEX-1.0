"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./AuthForm.module.css";
import { playPlink } from "@/lib/sfx";
import { emitJustRegistered } from "./PokedexShell";

const REGISTER_ERRORS = {
  invalid_login: "Login inválido (3–20 letras, números, ponto, traço ou underline).",
  invalid_email: "E-mail inválido.",
  weak_password: "A senha precisa ter pelo menos 8 caracteres.",
  invalid_name: "Informe seu nome.",
  already_exists: "Já existe uma conta com esse login ou e-mail.",
  rate_limited: "Muitas tentativas em pouco tempo — espera um pouco e tenta de novo.",
};

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleModeChange = (nextMode) => {
    playPlink();
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, email, password, name }),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(REGISTER_ERRORS[data.error] ?? "Não foi possível criar a conta.");
          return;
        }
      }

      const result = await signIn("credentials", { login, password, redirect: false });
      if (result?.error) {
        setError("Login ou senha incorretos.");
      } else {
        if (mode === "register") {
          emitJustRegistered(name.trim());
        }
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === "login" ? styles.tabActive : styles.tab}
          onClick={() => handleModeChange("login")}
        >
          Entrar
        </button>
        <button
          type="button"
          className={mode === "register" ? styles.tabActive : styles.tab}
          onClick={() => handleModeChange("register")}
        >
          Criar conta
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="Login"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          autoComplete="username"
          required
        />

        {mode === "register" && (
          <>
            <input
              type="email"
              className={styles.input}
              placeholder="E-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="text"
              className={styles.input}
              placeholder="Seu nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={40}
              required
            />
          </>
        )}

        <input
          type="password"
          className={styles.input}
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={mode === "register" ? 8 : undefined}
          required
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
