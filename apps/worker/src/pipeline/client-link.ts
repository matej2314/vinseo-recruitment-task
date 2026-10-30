import type {
  ClientLinkStatus,
  SourceParticipant,
} from '@vinseo/contracts';

export interface ExternalParticipantMeta {
  readonly email: string;
  readonly displayName: string;
}

export type ResolvedClientLink =
  | {
      readonly status: 'internal';
      readonly externalParticipants: null;
      readonly clientId: null;
    }
  | {
      readonly status: 'matched';
      readonly externalParticipants: readonly ExternalParticipantMeta[];
      readonly clientId: string;
    }
  | {
      readonly status: 'unmatched';
      readonly externalParticipants: readonly ExternalParticipantMeta[];
      readonly clientId: null;
    };

export function extractExternalParticipants(
  participants: readonly SourceParticipant[],
): {
  readonly externalParticipants: readonly ExternalParticipantMeta[];
  readonly emailDomains: readonly string[];
} {
  const externalParticipants: ExternalParticipantMeta[] = [];
  for (const participant of participants) {
    if (participant.internal) continue;
    const email = participant.email;
    if (email === null || !email.includes('@')) continue;
    externalParticipants.push({
      email,
      displayName: participant.displayName,
    });
  }

  const emailDomains = [
    ...new Set(
      externalParticipants.map((p) => {
        const at = p.email.lastIndexOf('@');
        return p.email.slice(at + 1).toLowerCase();
      }),
    ),
  ];

  return { externalParticipants, emailDomains };
}

export async function resolveClientLink(
  participants: readonly SourceParticipant[],
  findClientByDomain: (
    emailDomain: string,
  ) => Promise<{ id: string } | null>,
): Promise<ResolvedClientLink> {
  const { externalParticipants, emailDomains } =
    extractExternalParticipants(participants);

  if (externalParticipants.length === 0) {
    return {
      status: 'internal' satisfies ClientLinkStatus,
      externalParticipants: null,
      clientId: null,
    };
  }

  for (const domain of emailDomains) {
    const client = await findClientByDomain(domain);
    if (client !== null) {
      return {
        status: 'matched',
        externalParticipants,
        clientId: client.id,
      };
    }
  }

  return {
    status: 'unmatched',
    externalParticipants,
    clientId: null,
  };
}
