import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class CallForService {
  @Prop()
  requester: string;

  @Prop()
  squadId: string;

  @Prop()
  offlinePolices: string[];
}

export const CallForServiceSchema =
  SchemaFactory.createForClass(CallForService);
