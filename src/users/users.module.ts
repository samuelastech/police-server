import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { hashSync } from 'bcrypt';
import { PoliceSchema } from './schemas/police.schema';
import { OperatorSchema } from './schemas/operator.schema';
import { ManagerSchema } from './schemas/manager.schema';
import { UserType } from './user-type.enum';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
        discriminators: [
          { name: UserType.POLICE, schema: PoliceSchema },
          { name: UserType.OPERATOR, schema: OperatorSchema },
          { name: UserType.MANAGER, schema: ManagerSchema },
        ],
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
