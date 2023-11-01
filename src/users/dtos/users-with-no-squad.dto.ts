import { Expose } from 'class-transformer';

export class UsersWithNoSquad {
  @Expose()
  id: string;

  @Expose()
  name: string;
}
