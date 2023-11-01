import * as mongoose from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export abstract class TimeFrame {
  @Prop({ default: mongoose.now() })
  startedAt: Date;

  @Prop({ default: null })
  endedAt: Date;
}
