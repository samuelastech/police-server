import { Injectable } from '@nestjs/common';
import { Occurrence } from './schemas/ocurrence.schema';
import { Model, now } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { WorkService } from './work.service';
import { SquadService } from '../squad/squad.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OccurrenceService {
  constructor(
    @InjectModel('Occurrence')
    private readonly occurrenceModel: Model<Occurrence>,
    private readonly workService: WorkService,
    private readonly squadService: SquadService,
    private readonly usersService: UsersService,
  ) {}

  async startOccurrence(
    workId: string,
    squadId: string,
    occurrenceType: string,
  ) {
    const occurrence = await this.occurrenceModel.create({
      squadWork: workId,
      occurrenceType,
    });
    await this.bindPolices(occurrence.id, squadId);
    await this.bindOccurrence(occurrence.id, workId);
    return occurrence;
  }

  async startAlone(workId: string, clientId: string, occurrenceType: string) {
    const occurrence = await this.occurrenceModel.create({
      squadWork: workId,
      occurrenceType,
    });
    await this.bindOccurrence(occurrence.id, workId);
    const user = (await this.usersService.listOne(String(clientId))) as any;
    user.occurrences.push(occurrence.id);
    console.log(user);
    await user.save();
    return occurrence;
  }

  finishOccurrence(occurrenceId: string) {
    return this.occurrenceModel.findByIdAndUpdate(
      occurrenceId,
      {
        $set: {
          endedAt: now(),
        },
      },
      { new: true },
    );
  }

  async saveCoords(occurrenceId: string, coords: number[]) {
    const occurrence = (await this.occurrenceModel.findById(
      occurrenceId,
    )) as any;
    occurrence.coordinates.push({ latitude: coords[0], longitude: coords[1] });
    await occurrence.save();
  }

  async registerOperator(occurrenceId: string, workId: string, userId: string) {
    await this.bindOccurrence(occurrenceId, workId);
    await this.bindOperator(occurrenceId, userId);
    return this.occurrenceModel.findByIdAndUpdate(
      occurrenceId,
      {
        $set: { operatorWork: workId },
      },
      { new: true },
    );
  }

  async registerAloneSupport(occurrenceId: string, clientId: string) {
    const user = (await this.usersService.listOne(String(clientId))) as any;
    user.supported.push(occurrenceId);
    await user.save();
    return this.occurrenceModel.findByIdAndUpdate(
      occurrenceId,
      {
        $addToSet: { squadsOnBackup: clientId },
      },
      { new: true },
    );
  }

  async registerSupport(occurrenceId: string, squadId: string) {
    await this.bindSupport(occurrenceId, squadId);
    return this.occurrenceModel.findByIdAndUpdate(
      occurrenceId,
      {
        $addToSet: { squadsOnBackup: squadId },
      },
      { new: true },
    );
  }

  private async bindOperator(occurrenceId: string, operatorId: string) {
    const user = (await this.usersService.listOne(String(operatorId))) as any;
    user.occurrences.push(occurrenceId);
    await user.save();
  }

  private async bindPolices(occurrenceId: string, squadId: string) {
    const { polices } = await this.squadService.findOne(squadId);
    for (const police of polices) {
      const user = (await this.usersService.listOne(String(police))) as any;
      user.occurrences.push(occurrenceId);
      await user.save();
    }
  }

  private async bindOccurrence(occurrenceId: string, workId: string) {
    const work = (await this.workService.findOne(workId)) as any;
    work.occurrences.push(occurrenceId);
    await work.save();
  }

  private async bindSupport(occurrenceId: string, squadId: string) {
    const { polices } = await this.squadService.findOne(squadId);
    for (const police of polices) {
      const user = (await this.usersService.listOne(String(police))) as any;
      user.supported.push(occurrenceId);
      await user.save();
    }
  }
}
