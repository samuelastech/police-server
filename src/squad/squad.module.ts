import { Module } from '@nestjs/common';
import { SquadService } from './squad.service';
import { SquadController } from './squad.controller';
import { UsersModule } from 'src/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { SquadSchema } from './schemas/squad.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Squad', schema: SquadSchema }]),
    UsersModule,
  ],
  controllers: [SquadController],
  providers: [SquadService],
  exports: [SquadService],
})
export class SquadModule {}
