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
        this.server.to(client.id).emit('startAlone');
        const workId = await this.workService.startSolo(userId);
        client.data.workId = String(workId);
        return;
      }

      this.server.to(client.id).emit('waitForSquad');
      // Send notification to those who are online
      client.to(Rooms.Squad + ':' + squadId).emit('squad:startWork');
      this.squadWaitQueue.set(squadId, Object.keys(squadMembers).length);

      // Persist the request to those offline
      const offlinePolices = [];
      for (const member in squadMembers) {
        if (!squadMembers[member]) {
          offlinePolices.push(member);
        }
      }

      if (offlinePolices.length) {
        await this.workService.persistCFS(userId, squadId, offlinePolices);
      }

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
      return;
    }

    if (workType === Rooms.Patrolling) {
      if (!squadId) {
        this.server.to(client.id).emit('squad:readyForFinishWork');
        client.to(Rooms.Operations).emit('police:finishedWork', client.id);
        await this.workService.finishWork(workId);
      } else {
        const memberStillOnline = await client
          .in(Rooms.Squad + ':' + squadId)
          .fetchSockets();

        if (!memberStillOnline.length) {
          this.server
            .to(Rooms.Squad + ':' + squadId)
            .emit('squad:readyForFinishWork');
          client.to(Rooms.Operations).emit('police:finishedWork', client.id);
          await this.workService.finishWork(workId);
          return;
        }
        client.to(Rooms.Squad + ':' + squadId).emit('squad:finishWork');
        this.squadWaitQueue.set(squadId, Object.keys(squadMembers).length);
        this.logger.log(
          `Squad member ${client.id} is requesting to finish working`,
        );
      }
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
      await this.cleanUpSquad(squadId);
    } else {
      this.squadWaitQueue.set(squadId, left);
    }
  }

  private async cleanUpSquad(squadId: string) {
    const sockets = await this.server
      .in(Rooms.Squad + ':' + squadId)
      .fetchSockets();

    for (const police of sockets) {
      this.server.to(Rooms.Operations).emit('police:finishedWork', police.id);
    }
  }
}
