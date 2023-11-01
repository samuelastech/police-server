import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { UserStatus } from '../user-type.enum';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsMongoId()
  squad?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: string;
}
