import { Suspense } from "react";
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { requireSessionCookies } from "@/lib/require-session";

type DashboardLayoutProps = {
  readonly children: ReactNode;
};

/**
 * Cache Components (Next 16): `cookies()` to Request-time API —
 * musi żyć wewnątrz `<Suspense>`, inaczej blocking-prerender po nawigacji
 * (np. register → /meetings).
 */
async function DashboardSessionGate({
  children,
}: {
  readonly children: ReactNode;
}) {
  await requireSessionCookies();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:px-6">
      <DashboardSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center px-4 py-8 text-sm text-muted-foreground">
          Ładowanie…
        </div>
      }
    >
      <DashboardSessionGate>{children}</DashboardSessionGate>
    </Suspense>
  );
}
