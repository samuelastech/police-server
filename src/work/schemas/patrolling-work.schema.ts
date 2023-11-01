import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Squad } from '../../squad/schemas/squad.schema';

@Schema()
export class PatrollingWork {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Squad.name,
    required: true,
  })
  squad: Squad;

  workType: string;
}

export const PatrollingWorkSchema =
  SchemaFactory.createForClass(PatrollingWork);
