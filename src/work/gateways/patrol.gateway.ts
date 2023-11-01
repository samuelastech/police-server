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
export class PatrolGateway {
  @WebSocketServer()
  private server: Server;
  private logger: Logger = new Logger('PatrolGateway');

  constructor(private readonly occurrencesService: OccurrenceService) {}

  @SubscribeMessage('police:position')
  async policePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() position: number[],
  ) {
    const { sendSquadPosition, squadId } = client.data;

    if (!sendSquadPosition) {
      this.logger.log(`Police ${client.id} is broadcasting position`);
      client
        .to(Rooms.Operations)
        .to(Rooms.Squad + ':' + squadId)
        .emit('patrol:position', { [client.id]: position });
    } else {
      this.logger.log(`Squad ${squadId} is broadcasting position`);
      client
        .to(Rooms.Operations)
        .emit('patrol:position', { [squadId]: position });
    }
  }

  @SubscribeMessage('occurrence:position')
  async occurrencePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() position: number[],
  ) {
    const { occurrenceId, sendSquadPosition, squadId } = client.data;
    await this.occurrencesService.saveCoords(occurrenceId, position);

    if (!sendSquadPosition) {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:chaserPosition', { [client.id]: position });
    } else {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:chaserPosition', { [squadId]: position });
    }
  }

  @SubscribeMessage('support:occurrence:position')
  supportOccurrencePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() position: number[],
  ) {
    const { occurrenceId, sendSquadPosition, squadId } = client.data;
    if (!sendSquadPosition) {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:position', { [client.id]: position });
    } else {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:position', { [squadId]: position });
    }
  }

  @SubscribeMessage('occurrence:leaveSupport')
  leaveSupport(@ConnectedSocket() client: Socket) {
    const { occurrenceId, squadId, sendSquadPosition, squadMembers } =
      client.data;

    this.logger.log(`Squad ${squadId} is leaving an occurrence`);
    client.to(Rooms.Squad + ':' + squadId).emit('squad:leaveSupport');

    if (sendSquadPosition) {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:cleanUp', squadId);
      this.logger.log(`Cleaning up squad ${squadId}`);
    } else {
      for (const police in squadMembers) {
        const clientId = this.server.sockets.sockets.get(
          squadMembers[police],
        ).id;

        this.server
          .to(Rooms.Occurrence + ':' + occurrenceId)
          .emit('support:cleanUp', clientId);
        this.logger.log(`Cleaning up client ${clientId}`);
      }
    }
  }

  @SubscribeMessage('squad:sendSquadPosition')
  patrolSendSquadPosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() sendSquadPosition: boolean,
  ) {
    const { squadMembers, squadId } = client.data;
    for (const police in squadMembers) {
      this.server.sockets.sockets.get(
        squadMembers[police],
      ).data.sendSquadPosition = sendSquadPosition;
    }
    client.data.sendSquadPosition = sendSquadPosition;
    this.server
      .to(Rooms.Squad + ':' + squadId)
      .emit('squad:toggleSquadCoords', sendSquadPosition);
    this.operationsCleanUp(client);
  }

  @SubscribeMessage('occurrence:sendSquadPosition')
  occurrenceSendSquadPosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() sendSquadPosition: boolean,
  ) {
    const { squadMembers, occurrenceId, squadId } = client.data;

    for (const police in squadMembers) {
      this.server.sockets.sockets.get(
        squadMembers[police],
      ).data.sendSquadPosition = sendSquadPosition;
    }
    client.data.sendSquadPosition = sendSquadPosition;
    client
      .to(Rooms.Squad + ':' + occurrenceId)
      .emit('occurrence:toggleSquadCoords', sendSquadPosition);

    if (sendSquadPosition) {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:cleanUp', squadId);
      this.logger.log(`Cleaning up squad ${squadId}`);
    } else {
      for (const police in squadMembers) {
        const clientId = this.server.sockets.sockets.get(
          squadMembers[police],
        ).id;

        this.server
          .to(Rooms.Occurrence + ':' + occurrenceId)
          .emit('support:cleanUp', clientId);
        this.logger.log(`Cleaning up client ${clientId}`);
      }
    }
  }

  @SubscribeMessage('police:startChase')
  async startChase(@ConnectedSocket() client: Socket) {
    const { squadId, squadMembers, workId } = client.data;

    const occurrence = await this.occurrencesService.startOccurrence(
      workId,
      squadId,
      OccurrenceCategory.CHASE,
    );

    for (const police in squadMembers) {
      const memberSocket = this.server.sockets.sockets.get(
        squadMembers[police],
      );
      memberSocket.join(Rooms.Occurrence + ':' + occurrence.id);
      memberSocket.data.occurrenceId = occurrence.id;
      client.to(memberSocket.id).emit('squad:startChase');
    }
    client.join(Rooms.Occurrence + ':' + occurrence.id);
    client.data.occurrenceId = occurrence.id;
    // client.to(Rooms.Occurrence + ':' + occurrence.id).emit('squad:startChase');
    client.to(Rooms.Operations).emit('operations:chaseAlert', {
      occurrenceId: occurrence.id,
      squadId,
      squadMembers: Object.values(squadMembers),
      requester: client.id,
    });
    this.logger.log(`Squad ${squadId} started a chase`);
  }

  @SubscribeMessage('police:finishChase')
  async finishChase(@ConnectedSocket() client: Socket) {
    const { occurrenceId, squadId, squadMembers } = client.data;

    await this.occurrencesService.finishOccurrence(occurrenceId);
    client.to(Rooms.Occurrence + ':' + occurrenceId).emit('squad:finishChase');

    client
      .to(Rooms.Occurrence + ':' + occurrenceId)
      .emit('support:finishChase', {
        squadId,
        squadMembers: Object.values(squadMembers),
        requester: client.id,
      });

    const agentsInOccurrence = await this.server
      .in(Rooms.Occurrence + ':' + occurrenceId)
      .fetchSockets();

    for (const agent of agentsInOccurrence) {
      const { workType } = agent.data;
      agent.leave(Rooms.Occurrence + ':' + occurrenceId);
      workType === Rooms.Patrolling
        ? agent.join(Rooms.Patrolling)
        : agent.join(Rooms.Operations);
    }

    this.logger.log(`Chase ${occurrenceId} was finished`);
  }

  @SubscribeMessage('squad:supportRequest')
  async supportRequest(@ConnectedSocket() client: Socket) {
    const { occurrenceId } = client.data;
    console.log(occurrenceId);
    const rooms = this.server.sockets.adapter.rooms.keys();
    for (const room of rooms) {
      if (room.match('squad')) {
        console.log(room);
        const members = await this.server.in(room).fetchSockets();
        client.to(members[0].id).emit('polices:supportRequest', occurrenceId);
      }
    }
    this.logger.log(`Client ${client.id} is calling for backup`);
  }

  @SubscribeMessage('police:acceptSupport')
  async acceptSupport(
    @ConnectedSocket() client: Socket,
    @MessageBody() occurrenceId: string,
  ) {
    const { squadMembers, squadId } = client.data;
    this.server.to(Rooms.Squad + ':' + squadId).emit('squad:calledToSupport');
    for (const police in squadMembers) {
      const memberSocket = this.server.sockets.sockets.get(
        squadMembers[police],
      );
      if (memberSocket) {
        memberSocket.join(Rooms.Occurrence + ':' + occurrenceId);
        memberSocket.data.occurrenceId = occurrenceId;
      }
    }
    client.join(Rooms.Occurrence + ':' + occurrenceId);
    client.data.occurrenceId = occurrenceId;
    await this.occurrencesService.registerSupport(occurrenceId, squadId);
    this.logger.log(`Squad ${squadId} is supporting the chase ${occurrenceId}`);
  }

  private operationsCleanUp(client: Socket) {
    const { sendSquadPosition, squadId, squadMembers } = client.data;
    if (sendSquadPosition) {
      client.to(Rooms.Operations).emit('police:cleanUp', squadId);
    } else {
      for (const police in squadMembers) {
        const clientId = this.server.sockets.sockets.get(
          squadMembers[police],
        ).id;
        client.to(Rooms.Operations).emit('police:cleanUp', clientId);
      }
    }
  }
}
