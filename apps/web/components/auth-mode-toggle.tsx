"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uiRoutes } from "@/lib/routes";

type AuthMode = "login" | "register";

/**
 * Placeholder auth — przełączanie trybu (SPEC-FRONTEND F-1).
 * Atrapa „sukcesu”: nawigacja na dashboard bez cookie (żywe auth = Faza 3).
 */
export function AuthModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "login" ? "default" : "outline"}
          onClick={() => setMode("login")}
        >
          Logowanie
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "default" : "outline"}
          onClick={() => setMode("register")}
        >
          Rejestracja
        </Button>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          router.push(uiRoutes.meetings);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" />
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
          />
        </div>
        <Button type="submit">
          {mode === "login" ? "Zaloguj (stub)" : "Zarejestruj (stub)"}
        </Button>
      </form>
    </div>
  );
}
