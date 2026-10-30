"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { uiRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const items = [
  { href: uiRoutes.meetings, label: "Spotkania" },
  { href: uiRoutes.search, label: "Wyszukiwarka" },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    router.replace(uiRoutes.auth);
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col gap-3 sm:w-48">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Panel
      </p>
      <nav className="flex flex-row gap-2 sm:flex-col">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: active ? "default" : "ghost" }),
                "justify-start",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-start",
        )}
      >
        Wyloguj
      </button>
    </aside>
  );
}
