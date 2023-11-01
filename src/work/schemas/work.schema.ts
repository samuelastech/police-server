import * as mongoose from 'mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { WorkCategory, WorkStatus } from '../work-types.enum';
import { Occurrence } from './ocurrence.schema';
import { TimeFrame } from './time-frame.schema';

export type WorkType = mongoose.HydratedDocument<Work>;

@Schema({ discriminatorKey: 'workType' })
export class Work extends TimeFrame {
  @Prop({
    type: String,
    enum: WorkCategory,
    required: true,
  })
  workType: string;

  @Prop({
    type: String,
    enum: WorkStatus,
    default: WorkStatus.IN_PROGRESS,
  })
  workStatus: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: Occurrence.name }],
    default: [],
    required: false,
  })
  occurrences: Occurrence[];
}

export const WorkSchema = SchemaFactory.createForClass(Work);
