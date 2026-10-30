import { IsString, MinLength } from 'class-validator';

export class RunMeetingDto {
  @IsString()
  @MinLength(1)
  fixtureKey!: string;
}
