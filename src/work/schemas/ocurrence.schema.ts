import { SchemaFactory, Schema, Prop } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Work } from './work.schema';
import { TimeFrame } from './time-frame.schema';
import { OccurrenceCategory, WorkStatus } from '../work-types.enum';

export type OccurrenceType = mongoose.HydratedDocument<Occurrence>;

@Schema({ discriminatorKey: 'occurrenceType' })
export class Occurrence extends TimeFrame {
  @Prop({
    type: String,
    enum: OccurrenceCategory,
    required: true,
  })
  occurrenceType: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Work' }],
    default: [],
    required: false,
  })
  squadsOnBackup: Work[];

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',
    default: null,
  })
  squadWork: Work;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',
    default: null,
    required: false,
  })
  operatorWork: Work;

  @Prop({
    type: String,
    enum: WorkStatus,
    default: WorkStatus.IN_PROGRESS,
  })
  occurrenceStatus: string;
}

export const OccurrenceSchema = SchemaFactory.createForClass(Occurrence);
