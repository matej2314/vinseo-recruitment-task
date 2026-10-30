"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  DemoRunMeetingResponseDto,
  MeetingListItemDto,
  MeetingListResponseDto,
  MeetingStatusEventDto,
  MeetingListLimit,
} from "@vinseo/contracts";
import { MEETING_LIST_LIMITS } from "@vinseo/contracts";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { uiRoutes } from "@/lib/routes";

type RowView = MeetingListItemDto & {
  readonly summaryPreview: string | null;
  readonly failureMessage: string | null;
};

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ready";
      readonly page: number;
      readonly limit: MeetingListLimit;
      readonly total: number;
      readonly rows: readonly RowView[];
    };

type RowPatch = Partial<RowView> & { readonly id: string };

function summaryToPreview(summary: unknown): string | null {
  if (summary == null) return null;
  if (typeof summary === "string") return summary.slice(0, 160);
  try {
    return JSON.stringify(summary).slice(0, 160);
  } catch {
    return null;
  }
}

function toRowView(item: MeetingListItemDto): RowView {
  return {
    ...item,
    summaryPreview: summaryToPreview(item.summary),
    failureMessage: item.failureReason,
  };
}

export function MeetingsDashboard() {
  const router = useRouter();
  const [limit, setLimit] = useState<MeetingListLimit>(10);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [testBusy, setTestBusy] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSessionThenLoad() {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (me.status === 401) {
        const refreshed = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!refreshed.ok) {
          router.replace(uiRoutes.auth);
          return;
        }
        const me2 = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!me2.ok) {
          router.replace(uiRoutes.auth);
          return;
        }
      } else if (!me.ok) {
        router.replace(uiRoutes.auth);
        return;
      }

      const res = await fetch(
        `/api/meetings?page=${page}&limit=${limit}`,
        { credentials: "same-origin" },
      );
      if (cancelled) return;
      if (!res.ok) {
        setState({
          status: "error",
          message: "Nie udało się pobrać listy spotkań.",
        });
        return;
      }
      const data = (await res.json()) as MeetingListResponseDto;
      setState({
        status: "ready",
        page: data.page,
        limit: data.limit as MeetingListLimit,
        total: data.total,
        rows: data.items.map(toRowView),
      });
    }

    setState({ status: "loading" });
    void ensureSessionThenLoad();
    return () => {
      cancelled = true;
    };
  }, [page, limit, router]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  function upsertRow(patch: RowPatch) {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const idx = prev.rows.findIndex((r) => r.id === patch.id);
      if (idx === -1) {
        const row = toRowView({
          id: patch.id,
          title: patch.title ?? null,
          startedAt: patch.startedAt ?? null,
          durationSeconds: patch.durationSeconds ?? null,
          organizerId: patch.organizerId ?? null,
          clientId: patch.clientId ?? null,
          clientLinkStatus: patch.clientLinkStatus ?? "unmatched",
          confidential: patch.confidential ?? false,
          processingStatus: patch.processingStatus ?? "pending",
          summary: patch.summary ?? null,
          failureReason: patch.failureReason ?? null,
        });
        return {
          ...prev,
          rows: [
            {
              ...row,
              summaryPreview: patch.summaryPreview ?? row.summaryPreview,
              failureMessage: patch.failureMessage ?? row.failureMessage,
            },
            ...prev.rows,
          ],
          total: prev.total + 1,
        };
      }
      const rows = prev.rows.slice();
      const current = rows[idx];
      if (!current) return prev;
      const merged: RowView = {
        ...current,
        ...patch,
        summaryPreview:
          patch.summaryPreview !== undefined
            ? patch.summaryPreview
            : patch.summary !== undefined
              ? summaryToPreview(patch.summary)
              : current.summaryPreview,
        failureMessage:
          patch.failureMessage !== undefined
            ? patch.failureMessage
            : patch.failureReason !== undefined
              ? patch.failureReason
              : current.failureMessage,
      };
      rows[idx] = merged;
      return { ...prev, rows };
    });
  }

  function openSse(meetingId: string) {
    eventSourceRef.current?.close();
    const es = new EventSource(`/api/meetings/${meetingId}/events`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onmessage = (ev) => {
      let payload: MeetingStatusEventDto;
      try {
        payload = JSON.parse(ev.data) as MeetingStatusEventDto;
      } catch {
        return;
      }

      // Tylko pola obecne w evencie — bez nadpisywania metadanych listy nullami.
      const failedWithoutReason =
        payload.processingStatus === "failed" &&
        payload.failureReason === undefined;

      upsertRow({
        id: payload.meetingId,
        processingStatus: payload.processingStatus,
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.summary !== undefined
          ? {
              summary: payload.summary,
              summaryPreview: summaryToPreview(payload.summary),
            }
          : {}),
        ...(payload.failureReason !== undefined
          ? {
              failureReason: payload.failureReason,
              failureMessage:
                payload.failureReason ?? "Przetwarzanie nie powiodło się.",
            }
          : {}),
        ...(failedWithoutReason
          ? { failureMessage: "Przetwarzanie nie powiodło się." }
          : {}),
      });

      if (
        payload.processingStatus === "completed" ||
        payload.processingStatus === "failed"
      ) {
        es.close();
        eventSourceRef.current = null;
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
  }

  async function onTest() {
    setTestBusy(true);
    setTestError(null);
    try {
      const res = await fetch("/api/demo/run-meeting", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setTestError("Nie udało się uruchomić demo.");
        return;
      }
      const data = (await res.json()) as DemoRunMeetingResponseDto;
      // Każdy sukces = własny meetingId runu (F-8); upsert dokłada wiersz przy nowym id
      upsertRow({
        id: data.meetingId,
        title: null,
        startedAt: null,
        durationSeconds: null,
        organizerId: null,
        clientId: null,
        clientLinkStatus: "unmatched",
        confidential: false,
        processingStatus: data.status,
        summary: null,
        failureReason: null,
        summaryPreview: null,
        failureMessage: null,
      });
      openSse(data.meetingId);
    } catch {
      setTestError("Błąd sieci przy Test.");
    } finally {
      setTestBusy(false);
    }
  }

  const totalPages =
    state.status === "ready"
      ? Math.max(1, Math.ceil(state.total / state.limit))
      : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Spotkania</h1>
        <Button type="button" onClick={onTest} disabled={testBusy}>
          Test
        </Button>
      </div>

      {testError ? (
        <p className="text-sm text-destructive" role="alert">
          {testError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Limit</span>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={limit}
            aria-label="Limit listy"
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value) as MeetingListLimit);
            }}
          >
            {MEETING_LIST_LIMITS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Poprzednia
          </Button>
          <span>
            Strona {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Następna
          </Button>
        </div>
      </div>

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : null}
      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tytuł</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Podsumowanie / błąd</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Brak spotkań. Użyj Test, aby uruchomić demo.
                </TableCell>
              </TableRow>
            ) : (
              state.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title ?? "—"}</TableCell>
                  <TableCell>{row.processingStatus}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                    {row.processingStatus === "failed"
                      ? (row.failureMessage ?? "failed")
                      : (row.summaryPreview ?? "—")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
