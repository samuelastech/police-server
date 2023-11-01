import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ManagerType = HydratedDocument<Manager>;

@Schema()
export class Manager {
  type: string;
}

export const ManagerSchema = SchemaFactory.createForClass(Manager);
