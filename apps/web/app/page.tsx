import { AppShell } from "@/components/app-shell";
import { AuthModeToggle } from "@/components/auth-mode-toggle";

export default function AuthPage() {
  return (
    <AppShell title="Logowanie / rejestracja" centered>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Szkielet UI v1. Sesja cookie HttpOnly i ochrona tras — Faza 3 (BFF →
        API). Tu tylko placeholdery formularza.
      </p>
      <AuthModeToggle />
    </AppShell>
  );
}
