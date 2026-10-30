export type UserId = string & { readonly __brand: 'UserId' };
export type MeetingId = string & { readonly __brand: 'MeetingId' };
export type ClientId = string & { readonly __brand: 'ClientId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type ExternalMeetingId = string & {
  readonly __brand: 'ExternalMeetingId';
};
export type FixtureKey = string & { readonly __brand: 'FixtureKey' };
export type RequestId = string & { readonly __brand: 'RequestId' };
export type JobId = string & { readonly __brand: 'JobId' };

export function asUserId(value: string): UserId {
  return value as UserId;
}

export function asMeetingId(value: string): MeetingId {
  return value as MeetingId;
}

export function asExternalMeetingId(value: string): ExternalMeetingId {
  return value as ExternalMeetingId;
}

export function asFixtureKey(value: string): FixtureKey {
  return value as FixtureKey;
}

export function asRequestId(value: string): RequestId {
  return value as RequestId;
}

export function asJobId(value: string): JobId {
  return value as JobId;
}
