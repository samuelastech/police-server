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
    const { squadId } = client.data;

    client
      .to(Rooms.Operations)
      .to(Rooms.Squad + ':' + squadId)
      .emit('patrol:position', { [client.id]: position });
  }

  @SubscribeMessage('occurrence:position')
  async occurrencePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() position: number[],
  ) {
    const { occurrenceId } = client.data;
    await this.occurrencesService.saveCoords(occurrenceId, position);

    client
      .to(Rooms.Occurrence + ':' + occurrenceId)
      .emit('support:chaserPosition', { [client.id]: position });
  }

  @SubscribeMessage('support:occurrence:position')
  async supportOccurrencePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() position: number[],
  ) {
    const { occurrenceId, squadMembers, squadId } = client.data;
    const room = Rooms.Occurrence + ':' + occurrenceId;

    if (!squadId) {
      client.to(room).emit('support:position', { [client.id]: position });
      return;
    }

    const members = Object.values<string>(squadMembers);
    const roomSockets = await this.server.in(room).fetchSockets();

    for (const socket of roomSockets) {
      if (!members.includes(socket.id)) {
        client
          .to(socket.id)
          .emit('support:position', { [client.id]: position });
      }
    }
  }

  @SubscribeMessage('occurrence:leaveSupport')
  async leaveSupport(@ConnectedSocket() client: Socket) {
    const { occurrenceId, squadId } = client.data;

    this.logger.log(`Squad ${squadId} is leaving an occurrence`);
    if (squadId) {
      client.to(Rooms.Squad + ':' + squadId).emit('squad:leaveSupport');
    }

    const sockets = await this.server
      .in(Rooms.Squad + ':' + squadId)
      .fetchSockets();

    for (const police of sockets) {
      client
        .to(Rooms.Occurrence + ':' + occurrenceId)
        .emit('support:cleanUp', police.id);
    }

    this.logger.log(`Cleaning up squad ${squadId}`);
  }

  @SubscribeMessage('police:startChase')
  async startChase(@ConnectedSocket() client: Socket) {
    const { squadId, squadMembers, workId, userId } = client.data;

    let occurrence;

    if (squadId) {
      occurrence = await this.occurrencesService.startOccurrence(
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
    } else {
      occurrence = await this.occurrencesService.startAlone(
        workId,
        userId,
        OccurrenceCategory.CHASE,
      );
    }
    client.join(Rooms.Occurrence + ':' + occurrence.id);
    client.data.occurrenceId = occurrence.id;
    // client.to(Rooms.Occurrence + ':' + occurrence.id).emit('squad:startChase');
    client.to(Rooms.Operations).emit('operations:chaseAlert', {
      occurrenceId: occurrence.id,
      // squadId,
      // squadMembers: Object.values(squadMembers),
      requester: client.id,
    });
    this.logger.log(`Squad ${squadId} started a chase`);
  }

  @SubscribeMessage('police:finishChase')
  async finishChase(@ConnectedSocket() client: Socket) {
    const { occurrenceId } = client.data;

    await this.occurrencesService.finishOccurrence(occurrenceId);
    client.to(Rooms.Occurrence + ':' + occurrenceId).emit('squad:finishChase');

    client
      .to(Rooms.Occurrence + ':' + occurrenceId)
      .emit('support:finishChase', {
        // squadId,
        // squadMembers: Object.values(squadMembers),
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

    const rooms = this.server.sockets.adapter.rooms.keys();
    for (const room of rooms) {
      if (room.match(Rooms.Squad) || room.match('alone')) {
        console.log(room);
        const members = await this.server.in(room).fetchSockets();
        console.log(members[0].id);
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
    const { squadMembers, squadId, userId } = client.data;

    if (squadId) {
      // Alerting squad that they are supporting
      this.server.to(Rooms.Squad + ':' + squadId).emit('squad:calledToSupport');
      // Putting each of them in the occurrence room
      for (const police in squadMembers) {
        const memberSocket = this.server.sockets.sockets.get(
          squadMembers[police],
        );
        if (memberSocket) {
          memberSocket.join(Rooms.Occurrence + ':' + occurrenceId);
          memberSocket.data.occurrenceId = occurrenceId;
        }
      }
      // Registering the supporting accpetance
      await this.occurrencesService.registerSupport(occurrenceId, squadId);
    } else {
      this.server.to(client.id).emit('squad:calledToSupport');
      await this.occurrencesService.registerAloneSupport(occurrenceId, userId);
    }

    client.join(Rooms.Occurrence + ':' + occurrenceId);
    client.data.occurrenceId = occurrenceId;

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
