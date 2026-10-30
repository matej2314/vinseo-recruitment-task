import { IsOptional, IsString, MinLength } from 'class-validator';

export class DevEnqueueMeetingDto {
  @IsString()
  @MinLength(1)
  fixtureKey!: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}
