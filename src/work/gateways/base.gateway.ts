import { BadRequestException, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Rooms } from '../rooms.enum';
import { AuthService } from '../../auth/auth.service';
import { WorkService } from '../work.service';
import { UsersService } from 'src/users/users.service';
import { SquadService } from 'src/squad/squad.service';
import { OccurrenceService } from '../occurrence.service';

@WebSocketGateway(0, {
  cors: {
    origin: '*',
  },
})
export class BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private logger: Logger = new Logger('WorkSocket');

  constructor(
    protected readonly authService: AuthService,
    protected readonly usersService: UsersService,
    protected readonly squadService: SquadService,
    protected readonly workService: WorkService,
    protected readonly occurrencesService: OccurrenceService,
  ) {}

  afterInit() {
    this.logger.log('Socker server started up');
  }

  handleConnection(client: Socket) {
    const { sub, type } = this.authService.verify({
      accessToken: client.handshake.headers.authorization,
    }) as any;

    if (!sub) {
      client.disconnect();
      return;
    }

    client.data.userId = sub;

    if (type === 'operator') {
      client.data.workType = Rooms.Operations;
      this.logger.log(
        `Client connected:
          - socketId: ${client.id}
          - userId: ${client.data.userId}
          - workType: ${client.data.workType}`,
      );
    } else {
      client.data.workType = Rooms.Patrolling;
      this.handleConnectPolice(client);
    }
    client.join(client.data.workType);
  }

  async handleConnectPolice(client: Socket) {
    const { userId } = client.data;
    const { squad } = (await this.usersService.listOne(userId)) as any;

    if (squad) {
      const { polices } = await this.squadService.findOne(squad);
      const squadMembers = {};
      for (const police of polices) {
        if (String(police) !== userId) {
          squadMembers[`${police}`] = null;
        }
      }

      client.data.squadId = String(squad);
      client.data.squadMembers = squadMembers;
      client.data.sendSquadPosition = true;
      client.join(Rooms.Squad + ':' + squad);
      this.handleBindSquad(client);
    }
  }

  async handleBindSquad(client: Socket) {
    const clients = await this.server.fetchSockets();
    for (const userId in client.data.squadMembers) {
      const squadMember = clients.filter((client) => {
        return userId === client.data.userId;
      })[0];
      if (squadMember) {
        client.data.squadMembers[userId] = squadMember.id;
        squadMember.data.squadMembers[client.data.userId] = client.id;
      }
    }
    this.logger.log(
      `Client connected:
        - socketId: ${client.id}
        - userId: ${client.data.userId}
        - workType: ${client.data.workType}
        - squadId: ${client.data.squadId}
        - squadMembers: ${JSON.stringify(client.data.squadMembers)}`,
    );
  }

  handleDisconnect(client: Socket) {
    const { squadId } = client.data;
    client.to(Rooms.Operations).emit('police:finishedWork', {
      squadId,
      requester: client.id,
    });
    this.logger.log(`Client ${client.id} left`);
  }

  protected occurrenceExists(occurrenceId: string): boolean {
    return this.server.sockets.adapter.rooms.has(occurrenceId);
  }
}
