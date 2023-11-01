import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class OperationsWork {
  occurrenceType: string;

  @Prop({ required: true })
  coordinates: number[][];
}

export const OperationsWorkSchema =
  SchemaFactory.createForClass(OperationsWork);
