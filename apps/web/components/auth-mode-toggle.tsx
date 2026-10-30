"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uiRoutes } from "@/lib/routes";

type AuthMode = "login" | "register";

type AuthFormState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "error"; readonly message: string };

/**
 * Auth UI v1 - SPEC-FRONTEND F-1.
 * Start: login; CTA; linki tekstowe; register: passwordConfirm + match przed submit.
 * Sesja tylko przez cookie HttpOnly z BFF - bez localStorage/sessionStorage.
 */
export function AuthModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const mismatch =
    mode === "register" &&
    passwordConfirm.length > 0 &&
    password !== passwordConfirm;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    if (typeof email !== "string" || !email) {
      setFormState({ status: "error", message: "Podaj e-mail." });
      return;
    }
    if (mode === "register" && password !== passwordConfirm) {
      setFormState({
        status: "error",
        message: "Hasła muszą być takie same.",
      });
      return;
    }

    setFormState({ status: "submitting" });
    const path =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email, password }
        : { email, password, passwordConfirm };

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      if (!res.ok) {
        let message = "Nie udało się zalogować.";
        try {
          const err = (await res.json()) as { message?: string };
          if (typeof err.message === "string") {
            message = err.message;
          }
        } catch {
          /* ignore */
        }
        setFormState({ status: "error", message });
        return;
      }
      router.push(uiRoutes.meetings);
      router.refresh();
    } catch {
      setFormState({
        status: "error",
        message: "Błąd sieci. Spróbuj ponownie.",
      });
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "register" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passwordConfirm">Powtórz hasło</Label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch ? (
              <p className="text-sm text-destructive" role="alert">
                Hasła nie są zgodne.
              </p>
            ) : null}
          </div>
        ) : null}
        <Button
          type="submit"
          disabled={formState.status === "submitting" || mismatch}
        >
          {mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
        </Button>
      </form>

      {formState.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {formState.message}
        </p>
      ) : null}

      <div className="text-center text-sm">
        {mode === "login" ? (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode("register");
              setFormState({ status: "idle" });
            }}
          >
            Nie masz konta? Zarejestruj się!
          </button>
        ) : (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode("login");
              setPasswordConfirm("");
              setFormState({ status: "idle" });
            }}
          >
            Masz już konto? Zaloguj się!
          </button>
        )}
      </div>
    </div>
  );
}
