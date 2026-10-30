import { Input } from "@/components/ui/input";
import { searchMockHits } from "@/lib/search-mock";

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Wyszukiwarka</h1>
      <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Atrapa: wyniki poniżej są hardcodowane. Brak wołań LLM / search /
        RAG w v1 (`SPEC-FRONTEND` F-12).
      </p>
      <Input
        type="search"
        placeholder="Szukaj (mock — bez API)"
        disabled
        aria-label="Pole wyszukiwania (mock)"
      />
      <ul className="flex flex-col gap-3">
        {searchMockHits.map((hit) => (
          <li key={hit.id} className="rounded-md border px-3 py-2">
            <p className="font-medium">{hit.title}</p>
            <p className="text-sm text-muted-foreground">{hit.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
