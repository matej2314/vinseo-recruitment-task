import type { MeetingSourcePayload } from "@vinseo/contracts";

import type { MeetingSourcePort } from "../adapters/meeting-source/meeting-source.port.js";
import type { LlmClientPort } from "../adapters/llm/llm-client.port.js";
import { MeetingProcessOrchestrator } from "./meeting-process.orchestrator.js";
import type { MeetingRepository } from "./meeting-repository.js";
import { SummarizeMeetingUseCase } from "./summarize-meeting.use-case.js";
import type { MeetingSummary } from "./summary.zod.js";

const sourcePayload: MeetingSourcePayload = {
  externalId: "demo-client-budget-pl",
  title: "Budżet kampanii Q4 - Client X",
  startedAt: "2026-10-15T09:00:00.000Z",
  participants: [
    {
      email: "anna.kowalska@vinseo.example",
      displayName: "Anna Kowalska",
      internal: true,
    },
  ],
  segments: [
    {
      speaker: "Anna Kowalska",
      text: "Mail anna.budget@vinseo.example i telefon +48 600 100 200.",
      startMs: 0,
    },
  ],
};

const happySummary: MeetingSummary = {
  shortSummary: "Ustalono budżet 50k PLN.",
  decisions: ["Budget 50k PLN"],
  actionItems: [
    {
      assignee: "Anna Kowalska",
      description: "Przygotować brief",
      dueDate: "2026-10-18",
    },
  ],
};

function createMeetingsMock(): jest.Mocked<MeetingRepository> {
  return {
    upsertPending: jest.fn().mockResolvedValue({ id: "meeting-1" }),
    markProcessing: jest.fn().mockResolvedValue(undefined),
    persistSuccess: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MeetingRepository>;
}

describe("MeetingProcessOrchestrator", () => {
  const payload = {
    externalMeetingId: "demo-client-budget-pl",
    source: "mock" as const,
    fixtureKey: "demo-client-budget-pl",
  };

  it("happy path: redact → summarize → persistSuccess (completed)", async () => {
    const meetings = createMeetingsMock();
    const source: MeetingSourcePort = {
      fetch: jest.fn().mockResolvedValue(sourcePayload),
    };
    const llm: LlmClientPort = {
      summarizeMeeting: jest.fn().mockResolvedValue(happySummary),
    };
    const orchestrator = new MeetingProcessOrchestrator(
      source,
      meetings,
      new SummarizeMeetingUseCase(llm),
    );

    await orchestrator.run(payload);

    expect(meetings.upsertPending).toHaveBeenCalledWith(
      "demo-client-budget-pl",
    );
    expect(meetings.markProcessing).toHaveBeenCalledWith(
      "demo-client-budget-pl",
    );
    expect(meetings.persistSuccess).toHaveBeenCalledTimes(1);
    const persistArg = meetings.persistSuccess.mock.calls[0]?.[0];
    expect(persistArg?.summary.actionItems.length).toBeGreaterThanOrEqual(1);
    expect(
      persistArg?.redactedSegments.some((s) =>
        s.text.includes("[REDACTED_EMAIL]"),
      ),
    ).toBe(true);
    expect(meetings.markFailed).not.toHaveBeenCalled();
  });

  it("fail-closed: invalid LLM → markFailed, no persistSuccess", async () => {
    const meetings = createMeetingsMock();
    const source: MeetingSourcePort = {
      fetch: jest.fn().mockResolvedValue(sourcePayload),
    };
    const llm: LlmClientPort = {
      summarizeMeeting: jest
        .fn()
        .mockResolvedValueOnce({ shortSummary: 123, decisions: "nope" })
        .mockResolvedValueOnce({ broken: true }),
    };
    const orchestrator = new MeetingProcessOrchestrator(
      source,
      meetings,
      new SummarizeMeetingUseCase(llm),
    );

    await orchestrator.run(payload);

    expect(meetings.markFailed).toHaveBeenCalledWith(
      "demo-client-budget-pl",
      "SUMMARY_VALIDATION_FAILED_AFTER_RETRY",
    );
    expect(meetings.persistSuccess).not.toHaveBeenCalled();
  });

  it("P-9: does not persist transcript/summary before LLM returns", async () => {
    const meetings = createMeetingsMock();
    let llmStarted = false;
    const source: MeetingSourcePort = {
      fetch: jest.fn().mockResolvedValue(sourcePayload),
    };
    const llm: LlmClientPort = {
      summarizeMeeting: jest.fn().mockImplementation(async () => {
        llmStarted = true;
        expect(meetings.persistSuccess).not.toHaveBeenCalled();
        return happySummary;
      }),
    };
    const orchestrator = new MeetingProcessOrchestrator(
      source,
      meetings,
      new SummarizeMeetingUseCase(llm),
    );

    await orchestrator.run(payload);

    expect(llmStarted).toBe(true);
    expect(meetings.markProcessing).toHaveBeenCalled();
    expect(meetings.persistSuccess).toHaveBeenCalledTimes(1);
  });

  it("idempotent re-run: upsertPending twice, same externalMeetingId", async () => {
    const meetings = createMeetingsMock();
    const source: MeetingSourcePort = {
      fetch: jest.fn().mockResolvedValue(sourcePayload),
    };
    const llm: LlmClientPort = {
      summarizeMeeting: jest.fn().mockResolvedValue(happySummary),
    };
    const orchestrator = new MeetingProcessOrchestrator(
      source,
      meetings,
      new SummarizeMeetingUseCase(llm),
    );

    await orchestrator.run(payload);
    await orchestrator.run(payload);

    expect(meetings.upsertPending).toHaveBeenCalledTimes(2);
    expect(
      meetings.upsertPending.mock.calls.every(
        ([id]) => id === "demo-client-budget-pl",
      ),
    ).toBe(true);
    expect(meetings.persistSuccess).toHaveBeenCalledTimes(2);
  });
});
