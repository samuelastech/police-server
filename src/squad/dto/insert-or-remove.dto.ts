import { IsMongoId, IsNotEmpty } from 'class-validator';

export class InsertOrRemoveDto {
  @IsMongoId()
  @IsNotEmpty()
  squadId: string;

  @IsMongoId()
  @IsNotEmpty()
  policeId: string;
}
