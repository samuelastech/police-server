import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, now } from 'mongoose';
import { WorkCategory, WorkStatus } from './work-types.enum';
import { Work } from './schemas/work.schema';
import { CallForService } from './schemas/call-for-service.schema';
import { UsersService } from '../users/users.service';
import { SquadService } from '../squad/squad.service';

@Injectable()
export class WorkService {
  constructor(
    @InjectModel(Work.name) private workModel: Model<Work>,
    @InjectModel(CallForService.name) private cfs: Model<CallForService>,
    private usersService: UsersService,
    private squadService: SquadService,
  ) {}

  async startWork(clientId: string, workType: string) {
    const { id } =
      workType === WorkCategory.OPERATIONS
        ? await this.workModel.create({ operator: clientId, workType })
        : await this.workModel.create({ squad: clientId, workType });

    await this.bindWork(id, clientId, workType);
    return id;
  }

  async startSolo(clientId: string) {
    const { id } = await this.workModel.create({
      squad: null,
      workType: WorkCategory.PATROLLING,
    });

    const resource = (await this.usersService.listOne(clientId)) as any;
    resource.work.push(id);
    await resource.save();
    return id;
  }

  async finishWork(workId: string) {
    const work = await this.workModel.findById(workId);
    work.workStatus = WorkStatus.FINISHED;
    work.endedAt = now();
    await work.save();
  }

  findOne(id: string) {
    return this.workModel.findById(id);
  }

  async persistCFS(
    requesterId: string,
    squadId: string,
    offlinePolices: string[],
  ) {
    const existRequest = await this.cfs.findOne({
      requester: requesterId,
      squadId,
    });

    if (!existRequest) {
      return this.cfs.create({
        requesterId,
        squadId,
        offlinePolices,
      });
    }
  }

  lookForCFS(squadId: string) {
    return this.cfs.findOne({ squadId });
  }

  finishCFS(squadId: string) {
    return this.cfs.deleteOne({ squadId });
  }

  isWorking(clientId: string, workType: string) {
    return workType === WorkCategory.OPERATIONS
      ? this.workModel.findOne({ operator: clientId, endedAt: null })
      : this.workModel.findOne({ squad: clientId, endedAt: null });
  }

  private async bindWork(workId: string, clientId: string, workType: string) {
    const resource =
      workType === WorkCategory.OPERATIONS
        ? ((await this.usersService.listOne(clientId)) as any)
        : ((await this.squadService.findOne(clientId)) as any);

    if (workType === WorkCategory.PATROLLING) {
      for (const police of resource.polices) {
        const foundPolice = (await this.usersService.listOne(police)) as any;
        foundPolice.work.push(workId);
        await foundPolice.save();
      }
    }

    resource.work.push(workId);
    await resource.save();
  }
}
