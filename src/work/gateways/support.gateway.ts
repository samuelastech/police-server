import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Rooms } from '../rooms.enum';
import { OccurrenceCategory } from '../work-types.enum';
import { OccurrenceService } from '../occurrence.service';

@WebSocketGateway(0, {
  cors: {
    origin: '*',
  },
})
export class SupportGateway {
  @WebSocketServer()
  private server: Server;
  private logger: Logger = new Logger('SupportGateway');
}
