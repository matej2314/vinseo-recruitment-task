"use client";

import { useState } from "react";

import type { ProcessingStatus } from "@vinseo/contracts";

import { Button } from "@/components/ui/button";
import {
  formatSummaryCounts,
  parseMeetingSummary,
} from "@/lib/meeting-summary";

const ACTION_ITEMS_PREVIEW = 3;

type MeetingResultCellProps = {
  readonly processingStatus: ProcessingStatus;
  readonly summary: unknown | null;
  readonly failureMessage: string | null;
};

export function MeetingResultCell({
  processingStatus,
  summary,
  failureMessage,
}: MeetingResultCellProps) {
  const [expanded, setExpanded] = useState(false);

  if (processingStatus === "failed") {
    return (
      <p className="max-w-md text-sm text-destructive whitespace-normal">
        {failureMessage ?? "Przetwarzanie nie powiodło się."}
      </p>
    );
  }

  if (processingStatus !== "completed") {
    return (
      <span className="text-sm text-muted-foreground">
        {processingStatus === "pending" || processingStatus === "processing"
          ? "W toku"
          : "—"}
      </span>
    );
  }

  const parsed = parseMeetingSummary(summary);
  if (parsed == null) {
    return (
      <span className="text-sm text-muted-foreground">
        Brak czytelnego podsumowania
      </span>
    );
  }

  const hasDetails =
    parsed.decisions.length > 0 || parsed.actionItems.length > 0;
  const visibleActions = parsed.actionItems.slice(0, ACTION_ITEMS_PREVIEW);
  const hiddenActions = Math.max(
    0,
    parsed.actionItems.length - ACTION_ITEMS_PREVIEW,
  );

  return (
    <div className="flex max-w-md flex-col gap-1.5 text-sm">
      <p className="line-clamp-3 text-foreground whitespace-normal">
        {parsed.shortSummary}
      </p>
      {hasDetails ? (
        <p className="text-xs text-muted-foreground">
          {formatSummaryCounts(
            parsed.decisions.length,
            parsed.actionItems.length,
          )}
        </p>
      ) : null}
      {hasDetails ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-auto w-fit px-0 text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((prev) => !prev);
          }}
        >
          {expanded ? "Zwiń" : "Szczegóły"}
        </Button>
      ) : null}
      {expanded && hasDetails ? (
        <div className="flex flex-col gap-2 border-l-2 border-muted pl-2 text-xs text-muted-foreground">
          {parsed.decisions.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Decyzje</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {parsed.decisions.map((decision) => (
                  <li key={decision} className="whitespace-normal">
                    {decision}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {parsed.actionItems.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Zadania</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {visibleActions.map((item) => (
                  <li
                    key={`${item.assignee}:${item.description}:${item.dueDate ?? ""}`}
                    className="whitespace-normal"
                  >
                    {item.description}
                    {" · "}
                    {item.assignee}
                    {" · "}
                    {item.dueDate ?? "bez terminu"}
                  </li>
                ))}
              </ul>
              {hiddenActions > 0 ? (
                <p className="mt-1">+{hiddenActions} więcej</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
