export type UserRole = 'employee' | 'admin';

export interface AuthUserDto {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface AuthSessionResponse {
  readonly user: AuthUserDto;
}
