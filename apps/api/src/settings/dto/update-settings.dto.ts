import { IsInt, Max, Min } from 'class-validator';

export const MAX_POINT_VALUE_VND = 100_000;

export class UpdateSettingsDto {
  @IsInt()
  @Min(1)
  @Max(MAX_POINT_VALUE_VND)
  pointValueVnd!: number;
}
