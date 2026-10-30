import { AppShell } from "@/components/app-shell";
import { AuthModeToggle } from "@/components/auth-mode-toggle";

export default function AuthPage() {
  return (
    <AppShell title="Logowanie / rejestracja" centered>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Sesja przez cookie HttpOnly (BFF → API). Brak tokenów w Web Storage.
      </p>
      <AuthModeToggle />
    </AppShell>
  );
}
