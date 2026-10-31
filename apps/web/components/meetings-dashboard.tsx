"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  DemoRunMeetingResponseDto,
  MeetingListItemDto,
  MeetingListResponseDto,
  MeetingRecordingDto,
  MeetingStatusEventDto,
  MeetingListLimit,
} from "@vinseo/contracts";
import { MEETING_LIST_LIMITS } from "@vinseo/contracts";

import { MeetingResultCell } from "@/components/meeting-result-cell";
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
  readonly failureMessage: string | null;
};

type ListQueryState = {
  readonly page: number;
  readonly limit: MeetingListLimit;
};

type TestActionState = {
  readonly busy: boolean;
  readonly error: string | null;
};

type RecordingActionState = {
  readonly busyId: string | null;
  readonly error: string | null;
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

function toRowView(item: MeetingListItemDto): RowView {
  return {
    ...item,
    failureMessage: item.failureReason,
  };
}

export function MeetingsDashboard() {
  const router = useRouter();
  const [listQuery, setListQuery] = useState<ListQueryState>({
    page: 1,
    limit: 10,
  });
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [testAction, setTestAction] = useState<TestActionState>({
    busy: false,
    error: null,
  });
  const [recordingAction, setRecordingAction] = useState<RecordingActionState>({
    busyId: null,
    error: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { page, limit } = listQuery;

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

    queueMicrotask(() => {
      if (cancelled) return;
      setState({ status: "loading" });
      void ensureSessionThenLoad();
    });
    return () => {
      cancelled = true;
    };
  }, [listQuery, router]);

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

      const failedWithoutReason =
        payload.processingStatus === "failed" &&
        payload.failureReason === undefined;

      upsertRow({
        id: payload.meetingId,
        processingStatus: payload.processingStatus,
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.summary !== undefined ? { summary: payload.summary } : {}),
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
    setTestAction({ busy: true, error: null });
    try {
      const res = await fetch("/api/demo/run-meeting", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setTestAction({ busy: false, error: "Nie udało się uruchomić demo." });
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
        failureMessage: null,
      });
      openSse(data.meetingId);
    } catch {
      setTestAction({ busy: false, error: "Błąd sieci przy Test." });
      return;
    }
    setTestAction({ busy: false, error: null });
  }

  async function onOpenRecording(meetingId: string) {
    setRecordingAction({ busyId: meetingId, error: null });
    try {
      const res = await fetch(
        `/api/meetings/${encodeURIComponent(meetingId)}/recording`,
        { credentials: "same-origin" },
      );
      if (!res.ok) {
        setRecordingAction({
          busyId: null,
          error:
            res.status === 404
              ? "Nie udało się otworzyć nagrania (brak dostępu lub zasób)."
              : "Nie udało się pobrać linku do nagrania.",
        });
        return;
      }
      const data = (await res.json()) as MeetingRecordingDto;
      if (typeof data.url !== "string" || data.url.length === 0) {
        setRecordingAction({
          busyId: null,
          error: "Odpowiedź nagrania bez poprawnego url.",
        });
        return;
      }
      const opened = window.open(data.url, "_blank", "noopener,noreferrer");
      if (opened == null) {
        setRecordingAction({
          busyId: null,
          error:
            "Przeglądarka zablokowała nowe okno. Odblokuj popupy dla tej strony.",
        });
        return;
      }
    } catch {
      setRecordingAction({
        busyId: null,
        error: "Błąd sieci przy pobieraniu nagrania.",
      });
      return;
    }
    setRecordingAction({ busyId: null, error: null });
  }

  const totalPages =
    state.status === "ready"
      ? Math.max(1, Math.ceil(state.total / state.limit))
      : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Spotkania</h1>
        <Button type="button" onClick={onTest} disabled={testAction.busy}>
          Test
        </Button>
      </div>

      {testAction.error ? (
        <p className="text-sm text-destructive" role="alert">
          {testAction.error}
        </p>
      ) : null}

      {recordingAction.error ? (
        <p className="text-sm text-destructive" role="alert">
          {recordingAction.error}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Przycisk „Nagranie” jest zawsze widoczny w v0 (demo). Docelowo widoczność będzie powiązana ze zgodą na
        nagrywanie.
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Limit</span>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={listQuery.limit}
            aria-label="Limit listy"
            onChange={(e) => {
              setListQuery({
                page: 1,
                limit: Number(e.target.value) as MeetingListLimit,
              });
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
            disabled={listQuery.page <= 1}
            onClick={() =>
              setListQuery((prev) => ({
                ...prev,
                page: Math.max(1, prev.page - 1),
              }))
            }
          >
            Poprzednia
          </Button>
          <span>
            Strona {listQuery.page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listQuery.page >= totalPages}
            onClick={() =>
              setListQuery((prev) => ({
                ...prev,
                page: prev.page + 1,
              }))
            }
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
              <TableHead>Wynik</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Brak spotkań. Użyj Test, aby uruchomić demo.
                </TableCell>
              </TableRow>
            ) : (
              state.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title ?? "—"}</TableCell>
                  <TableCell>{row.processingStatus}</TableCell>
                  <TableCell className="align-top">
                    <MeetingResultCell
                      processingStatus={row.processingStatus}
                      summary={row.summary}
                      failureMessage={row.failureMessage}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={recordingAction.busyId === row.id}
                      onClick={() => {
                        void onOpenRecording(row.id);
                      }}
                    >
                      {recordingAction.busyId === row.id ? "…" : "Nagranie"}
                    </Button>
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
