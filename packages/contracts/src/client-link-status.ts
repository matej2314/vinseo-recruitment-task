export const CLIENT_LINK_STATUSES = [
  'internal',
  'matched',
  'unmatched',
] as const;

export type ClientLinkStatus = (typeof CLIENT_LINK_STATUSES)[number];
