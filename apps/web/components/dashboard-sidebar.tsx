"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside className="flex w-full flex-col gap-3 sm:w-48">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Panel (stub)
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
      <Link
        href={uiRoutes.auth}
        className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
      >
        Wyloguj (stub)
      </Link>
    </aside>
  );
}
