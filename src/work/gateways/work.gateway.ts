import { BadRequestException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Rooms } from '../rooms.enum';
import { WorkService } from '../work.service';

@WebSocketGateway(0, {
  cors: {
    origin: '*',
  },
})
export class WorkGateway {
  @WebSocketServer()
  private server: Server;
  private logger: Logger = new Logger('WorkGateway');
  private squadWaitQueue = new Map();

  constructor(private readonly workService: WorkService) {}

  @SubscribeMessage('agent:startWork')
  async startWork(@ConnectedSocket() client: Socket) {
    const { userId, workType, squadId, squadMembers } = client.data;

    if (workType === Rooms.Patrolling) {
      if (!squadId) {
        throw new BadRequestException(
          'You cannot start to patrol if you do not have a squad',
        );
      }

      const memberStillOnline = await client
        .in(Rooms.Squad + ':' + squadId)
        .fetchSockets();

      if (!memberStillOnline.length) {
        this.server.to(Rooms.Squad + ':' + squadId).emit('squad:readyForWork');
        const workId = await this.workService.startWork(squadId, workType);
        client.data.workId = String(workId);
        return;
      }

      client.to(Rooms.Squad + ':' + squadId).emit('squad:startWork');
      this.squadWaitQueue.set(squadId, Object.keys(squadMembers).length);
      this.logger.log(
        `Squad member ${client.id} is requesting to start to work`,
      );
    } else {
      const workId = await this.workService.startWork(userId, workType);
      client.data.workId = String(workId);
      this.logger.log(`Operator ${client.id} started to work`);
    }
  }

  @SubscribeMessage('squad:acceptStartWork')
  async acceptStartWork(@ConnectedSocket() client: Socket) {
    const { squadId, workType, squadMembers } = client.data;
    const left = this.squadWaitQueue.get(squadId) - 1;

    if (left === 0) {
      this.squadWaitQueue.delete(squadId);
      this.server.to(Rooms.Squad + ':' + squadId).emit('squad:readyForWork');
      const workId = await this.workService.startWork(squadId, workType);
      for (const police in squadMembers) {
        client.data.workId = String(workId);
        this.server.sockets.sockets.get(squadMembers[police]).data.workId =
          String(workId);
      }
      this.logger.log(`Squad ${squadId} started their work`);
    } else {
      this.squadWaitQueue.set(squadId, left);
    }
  }

  @SubscribeMessage('agent:finishWork')
  async finishWork(@ConnectedSocket() client: Socket) {
    const { workType, workId, squadId, squadMembers } = client.data;

    if (!workId) {
      this.logger.error('There is no work to finish my champion');
      this.server
        .to(Rooms.Squad + ':' + squadId)
        .emit('squad:readyForFinishWork');
    }

    if (workType === Rooms.Patrolling) {
      if (!squadId) {
        throw new BadRequestException(
          'You cannot finisha a patrol if you do not have a squad',
        );
      }
      const memberStillOnline = await client
        .in(Rooms.Squad + ':' + squadId)
        .fetchSockets();

      if (!memberStillOnline.length) {
        this.server
          .to(Rooms.Squad + ':' + squadId)
          .emit('squad:readyForFinishWork');
        client.to(Rooms.Operations).emit('police:finishedWork', squadId);
        await this.workService.finishWork(workId);
        return;
      }

      client.to(Rooms.Squad + ':' + squadId).emit('squad:finishWork');
      this.squadWaitQueue.set(squadId, Object.keys(squadMembers).length);
      this.logger.log(
        `Squad member ${client.id} is requesting to finish working`,
      );
    } else {
      this.workService.finishWork(workId);
    }
  }

  @SubscribeMessage('squad:acceptFinishWork')
  async acceptFinishWork(@ConnectedSocket() client: Socket) {
    const { squadId, workId, squadMembers } = client.data;
    const left = this.squadWaitQueue.get(squadId) - 1;

    if (left === 0) {
      this.squadWaitQueue.delete(squadId);
      this.server
        .to(Rooms.Squad + ':' + squadId)
        .emit('squad:readyForFinishWork');
      this.workService.finishWork(workId);
      for (const police in squadMembers) {
        client.data.workId = null;
        this.server.sockets.sockets.get(squadMembers[police]).data.workId =
          null;
      }
      this.logger.log(`Squad ${squadId} finished their work`);
      this.cleanUpSquad(client);
    } else {
      this.squadWaitQueue.set(squadId, left);
    }
  }

  private cleanUpSquad(client: Socket) {
    const { sendSquadPosition, squadId, squadMembers } = client.data;
    if (sendSquadPosition) {
      client.to(Rooms.Operations).emit('police:finishedWork', squadId);
    } else {
      for (const police in squadMembers) {
        const clientId = this.server.sockets.sockets.get(
          squadMembers[police],
        ).id;
        client.to(Rooms.Operations).emit('police:finishedWork', clientId);
      }
    }
  }
}
