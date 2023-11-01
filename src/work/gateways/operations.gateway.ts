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
import { OccurrenceService } from '../occurrence.service';

@WebSocketGateway(0, {
  cors: {
    origin: '*',
  },
})
export class OperationsGateway {
  @WebSocketServer()
  private server: Server;
  private logger: Logger = new Logger('OperationsGateway');

  constructor(private readonly occurrencesService: OccurrenceService) {}

  @SubscribeMessage('operations:acceptChase')
  async acceptChase(
    @ConnectedSocket() client: Socket,
    @MessageBody() occurrenceId,
  ) {
    const { userId, workId } = client.data;
    client.data.occurrenceId = occurrenceId;
    client.leave(Rooms.Operations);
    client.join(Rooms.Occurrence + ':' + occurrenceId);
    await this.occurrencesService.registerOperator(
      occurrenceId,
      workId,
      userId,
    );
    this.logger.log(`Operator ${client.id} is supporting ${occurrenceId}`);
  }
}
