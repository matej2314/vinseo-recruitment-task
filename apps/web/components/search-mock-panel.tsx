"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { searchMockHits } from "@/lib/search-mock";

/**
 * Mock wyszukiwarki — F-11…F-12. Filtr lokalny po hardcodzie; zero fetch.
 */
export function SearchMockPanel() {
  const [query, setQuery] = useState("");

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchMockHits;
    return searchMockHits.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.snippet.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Wyszukiwarka</h1>
      <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Atrapa: wyniki są hardcodowane (filtr tylko w przeglądarce). Brak wołań
        LLM / search / RAG w v1 (`SPEC-FRONTEND` F-12).
      </p>
      <Input
        type="search"
        placeholder="Szukaj (mock — bez API)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Pole wyszukiwania (mock)"
      />
      <ul className="flex flex-col gap-3">
        {hits.map((hit) => (
          <li key={hit.id} className="rounded-md border px-3 py-2">
            <p className="font-medium">{hit.title}</p>
            <p className="text-sm text-muted-foreground">{hit.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
