import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";

type DashboardLayoutProps = {
  readonly children: ReactNode;
};

/**
 * Layout po atrapie logowania — sidebar domyślny ↔ wyszukiwarka (F-3).
 * Ochrona sesji (redirect na `/`) — Faza 3.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:px-6">
      <DashboardSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
