import { Expose } from 'class-transformer';
import { UserType } from '../user-type.enum';
import { Work } from '../../work/schemas/work.schema';
import { Occurrence } from '../../work/schemas/ocurrence.schema';
import { Types } from 'mongoose';

export class UserDto {
  @Expose()
  id?: Types.ObjectId;

  @Expose()
  name?: string;

  @Expose()
  email?: string;

  @Expose()
  type?: UserType;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

  @Expose()
  work?: Work[];

  @Expose()
  occurrences?: Occurrence[];

  @Expose()
  supported?: Occurrence[];
}
