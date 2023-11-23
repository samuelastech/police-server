import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OccurrenceCategory, WorkCategory } from './work-types.enum';
import { WorkSchema } from './schemas/work.schema';
import { OperationsWorkSchema } from './schemas/operations-work.schema';
import { PatrollingWorkSchema } from './schemas/patrolling-work.schema';
import { AuthModule } from '../auth/auth.module';
import { WorkService } from './work.service';
import { OperationsGateway } from './gateways/operations.gateway';
import { SquadModule } from 'src/squad/squad.module';
import { UsersModule } from 'src/users/users.module';
import { OccurrenceSchema } from './schemas/ocurrence.schema';
import { ChaseOcurrenceSchema } from './schemas/chase-ocurrence.schema';
import { OccurrenceService } from './occurrence.service';
import { PatrolGateway } from './gateways/patrol.gateway';
import { BaseGateway } from './gateways/base.gateway';
import { WorkGateway } from './gateways/work.gateway';
import { SupportGateway } from './gateways/support.gateway';
import { CallForServiceSchema } from './schemas/call-for-service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Work',
        schema: WorkSchema,
        discriminators: [
          { name: WorkCategory.OPERATIONS, schema: OperationsWorkSchema },
          { name: WorkCategory.PATROLLING, schema: PatrollingWorkSchema },
        ],
      },
      {
        name: 'Occurrence',
        schema: OccurrenceSchema,
        discriminators: [
          { name: OccurrenceCategory.CHASE, schema: ChaseOcurrenceSchema },
        ],
      },
      {
        name: 'CallForService',
        schema: CallForServiceSchema,
      },
    ]),
    AuthModule,
    UsersModule,
    SquadModule,
  ],
  providers: [
    BaseGateway,
    WorkGateway,
    OperationsGateway,
    PatrolGateway,
    SupportGateway,
    WorkService,
    OccurrenceService,
  ],
})
export class WorkModule {}
