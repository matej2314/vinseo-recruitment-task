import type { UserRole } from '@vinseo/contracts';

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}
