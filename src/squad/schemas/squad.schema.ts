import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Police } from '../../users/schemas/police.schema';
import { WorkableEntity } from 'src/work/schemas/workable-entity.schema';

@Schema({ timestamps: true })
export class Squad extends WorkableEntity {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Police' }],
    required: true,
  })
  polices: Police[];
}

export const SquadSchema = SchemaFactory.createForClass(Squad);
