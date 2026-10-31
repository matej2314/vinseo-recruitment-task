/**
 * Podgląd kanonicznego summary UC1 w tabeli v1 (bez strony detail).
 * Kształt: shortSummary, decisions, actionItems — bez Zod w packages/.
 */

export type MeetingActionItemView = {
  readonly assignee: string;
  readonly description: string;
  readonly dueDate: string | null;
};

export type MeetingSummaryView = {
  readonly shortSummary: string;
  readonly decisions: readonly string[];
  readonly actionItems: readonly MeetingActionItemView[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseActionItem(value: unknown): MeetingActionItemView | null {
  if (value == null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.assignee) || !isNonEmptyString(record.description)) {
    return null;
  }
  if (
    record.dueDate !== null &&
    record.dueDate !== undefined &&
    typeof record.dueDate !== "string"
  ) {
    return null;
  }
  return {
    assignee: record.assignee.trim(),
    description: record.description.trim(),
    dueDate:
      typeof record.dueDate === "string" && record.dueDate.length > 0
        ? record.dueDate
        : null,
  };
}

/**
 * Parsuje `summary` z listy / SSE. Nieznany kształt → `null` (bez JSON dump).
 * Gdy brak `shortSummary`, a są decyzje — pierwszy punkt jako skrót (stare rekordy).
 */
export function parseMeetingSummary(
  summary: unknown,
): MeetingSummaryView | null {
  if (summary == null || typeof summary !== "object") return null;

  const record = summary as Record<string, unknown>;

  const decisions = Array.isArray(record.decisions)
    ? record.decisions.filter((item): item is string => typeof item === "string")
    : [];

  const actionItems = Array.isArray(record.actionItems)
    ? record.actionItems
        .map(parseActionItem)
        .filter((item): item is MeetingActionItemView => item != null)
    : [];

  let shortSummary: string | null = null;
  if (isNonEmptyString(record.shortSummary)) {
    shortSummary = record.shortSummary.trim();
  } else if (decisions[0] != null && decisions[0].trim().length > 0) {
    shortSummary = decisions[0].trim();
  }

  if (
    shortSummary == null &&
    decisions.length === 0 &&
    actionItems.length === 0
  ) {
    return null;
  }

  return {
    shortSummary: shortSummary ?? "Brak krótkiego podsumowania",
    decisions,
    actionItems,
  };
}

function plCount(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  if (count === 1) return `1 ${one}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
}

/** Meta pod skrótem, np. „2 decyzje · 1 zadanie”. */
export function formatSummaryCounts(
  decisionsCount: number,
  actionItemsCount: number,
): string {
  return [
    plCount(decisionsCount, "decyzja", "decyzje", "decyzji"),
    plCount(actionItemsCount, "zadanie", "zadania", "zadań"),
  ].join(" · ");
}
