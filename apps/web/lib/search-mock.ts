/**
 * Statyczny mock wyszukiwarki - SPEC-FRONTEND F-11…F-12.
 * Zakaz wołań LLM / search / RAG z UI v1.
 */
export type SearchMockHit = {
  readonly id: string;
  readonly title: string;
  readonly snippet: string;
};

export const searchMockHits: readonly SearchMockHit[] = [
  {
    id: "mock-1",
    title: "Przykładowe spotkanie (atrapa)",
    snippet: "Wynik hardcodowany - bez backendu AI.",
  },
  {
    id: "mock-2",
    title: "Drugi wpis mock",
    snippet: "UI v1 nie woła endpointów search/LLM.",
  },
] as const;
