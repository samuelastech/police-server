import { IsOptional, IsString } from 'class-validator';

export class UpdateSquadDto {
  @IsOptional()
  @IsString()
  name: string;
}
