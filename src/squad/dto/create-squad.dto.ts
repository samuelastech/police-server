import { Type } from 'class-transformer';
import { IsString, ArrayMinSize, IsArray, IsMongoId } from 'class-validator';
import { MessagesHelper } from 'src/utils/messages.helper';

export class CreateSquadDto {
  @IsString()
  name: string;

  @IsArray()
  @Type(() => String)
  @ArrayMinSize(1, { message: MessagesHelper.SQUAD_SIZE })
  @IsMongoId({ each: true, message: MessagesHelper.POLICE_ID_INVALID })
  polices: string[];
}
