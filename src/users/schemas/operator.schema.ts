import { SchemaFactory, Schema } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { WorkableEntity } from '../../work/schemas/workable-entity.schema';

export type OperatorType = mongoose.HydratedDocument<Operator>;

@Schema()
export class Operator extends WorkableEntity {
  type: string;
}

export const OperatorSchema = SchemaFactory.createForClass(Operator);
