import * as mongoose from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { Work } from './work.schema';
import { Occurrence } from './ocurrence.schema';

@Schema()
export abstract class WorkableEntity {
  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: Work.name }],
    default: [],
    required: false,
  })
  work: Work[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Occurrence' }],
    ref: 'Occurrence',
    default: [],
    required: false,
  })
  occurrences: Occurrence;
}
