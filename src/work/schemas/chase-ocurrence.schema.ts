import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

type Coordinates = { latitude: number; longitude: number }[];

@Schema()
export class ChaseOcurrence {
  workType: string;

  @Prop()
  coordinates: Coordinates;
}

export const ChaseOcurrenceSchema =
  SchemaFactory.createForClass(ChaseOcurrence);
