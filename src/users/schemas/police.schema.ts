import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Squad } from '../../squad/schemas/squad.schema';
import { Occurrence } from '../../work/schemas/ocurrence.schema';
import { WorkableEntity } from '../../work/schemas/workable-entity.schema';

export type PoliceType = mongoose.HydratedDocument<Police>;

@Schema()
export class Police extends WorkableEntity {
  type: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Squad',
    default: null,
    required: false,
  })
  squad: Squad;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Occurrence' }],
    ref: 'Occurrence',
    default: [],
    required: false,
  })
  supported: Occurrence;

  @Prop({ default: false, type: Boolean })
  module: boolean;
}

export const PoliceSchema = SchemaFactory.createForClass(Police);
