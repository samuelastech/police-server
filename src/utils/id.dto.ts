import { IsMongoId, IsNotEmpty } from 'class-validator';

export class IdDto {
  @IsMongoId()
  @IsNotEmpty()
  id: string;
}
