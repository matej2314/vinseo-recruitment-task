import type { ReactNode } from "react";

type AppShellProps = {
  readonly children: ReactNode;
  readonly title?: string;
  readonly centered?: boolean;
};

/**
 * Ramka robocza v1 - bez brandingu produktowego (docs/frontend.md).
 * RSC; bez logiki sesji (Faza 3).
 */
export function AppShell({ children, title, centered = false }: AppShellProps) {
  return (
    <div
      className={
        centered
          ? "mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-8 sm:px-6"
          : "mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
      }
    >
      {title ? (
        <header className={centered ? "w-full max-w-sm text-center" : undefined}>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </header>
      ) : null}
      <div
        className={
          centered ? "flex w-full max-w-sm flex-col items-center" : "flex-1"
        }
      >
        {children}
      </div>
    </div>
  );
}
