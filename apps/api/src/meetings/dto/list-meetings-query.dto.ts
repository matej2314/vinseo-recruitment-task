import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';
import { MEETING_LIST_LIMITS } from '@vinseo/contracts';

export class ListMeetingsQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([...MEETING_LIST_LIMITS])
  limit!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;
}
