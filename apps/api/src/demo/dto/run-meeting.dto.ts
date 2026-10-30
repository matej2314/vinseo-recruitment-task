import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Body DEMO jest opcjonalne. Nawet jeśli klient poda `fixtureKey`,
 * API demo **ignoruje** je i losuje z katalogu 10 (K-5).
 */
export class RunMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fixtureKey?: string;
}
