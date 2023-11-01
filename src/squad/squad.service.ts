import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSquadDto } from './dto/create-squad.dto';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Squad } from './schemas/squad.schema';
import { UsersService } from 'src/users/users.service';
import { UserType } from 'src/users/user-type.enum';
import { MessagesHelper } from 'src/utils/messages.helper';
import { User } from 'src/users/schemas/user.schema';
import { Police } from 'src/users/schemas/police.schema';

enum RelationType {
  BIND = 'bind',
  UNBIND = 'unbind',
}

@Injectable()
export class SquadService {
  constructor(
    @InjectModel('Squad') private readonly squadModel: Model<Squad>,
    private readonly usersService: UsersService,
  ) {}

  async insertPolice(squadId: string, policeId): Promise<void> {
    const squad = await this.findOne(squadId);
    const police = (await this.verifyPolice(policeId)) as any;
    if (squad.polices.indexOf(policeId) !== -1) {
      throw new BadRequestException(
        `Police ${policeId} already is in the squad ${squadId}`,
      );
    }
    squad.polices.push(policeId);
    police.squad = squadId;
    await squad.save();
    await police.save();
  }

  async removePolice(squadId: string, policeId) {
    const squad = await this.findOne(squadId);
    const police = (await this.verifyPolice(policeId)) as any;
    const policeIndex = squad.polices.indexOf(policeId);
    if (policeIndex === -1) {
      throw new BadRequestException(
        `Police ${policeId} is not in the squad ${squadId}`,
      );
    }
    squad.polices.splice(policeIndex);
    police.squad = null;
    await squad.save();
    await police.save();
  }

  async create(squad: CreateSquadDto): Promise<Squad> {
    await this.verifyPolice(squad.polices);
    const createdSquad = await this.squadModel.create(squad);
    await this.handleRelation(
      squad.polices,
      RelationType.BIND,
      createdSquad.id,
    );
    return createdSquad;
  }

  private async handleRelation(
    polices: string[],
    relationType: RelationType,
    squadId: string = null,
  ): Promise<void> {
    for (const police of polices) {
      const foundPolice = (await this.usersService.listOne(police)) as any;
      relationType === RelationType.BIND
        ? (foundPolice.squad = squadId)
        : (foundPolice.squad = null);
      await foundPolice.save();
    }
  }

  private async verifyPolice(polices: string[] | string): Promise<User> {
    if (typeof polices === 'string') {
      return this.existsAndIsPolice(polices);
    } else {
      for (const police of polices) {
        await this.existsAndIsPolice(police);
      }
    }
  }

  private async existsAndIsPolice(police: string): Promise<User> {
    const foundPolice = await this.usersService.listOne(police);
    if (!foundPolice) {
      throw new NotFoundException(`Police ${police} not found`);
    } else if (foundPolice.type !== UserType.POLICE) {
      throw new BadRequestException(MessagesHelper.ADD_WRONG_ID_TO_SQUAD);
    }
    return foundPolice;
  }

  findAll() {
    return this.squadModel.find();
  }

  async findOne(id: string) {
    console.log(id);
    const squad = await this.squadModel.findById(id);
    if (!squad) throw new NotFoundException(`Squad ${id} not found`);
    return squad;
  }

  async update(id: string, params: UpdateSquadDto) {
    const squad = await this.squadModel.findByIdAndUpdate(id, params, {
      new: true,
    });
    if (!squad) throw new NotFoundException(`Squad ${id} not found`);
    return squad;
  }

  async remove(id: string) {
    const squad = await this.squadModel.findByIdAndDelete(id);
    if (!squad) throw new NotFoundException(`Squad ${id} not found`);
    const polices = squad.polices.map((police) => `${police}`);
    await this.handleRelation(polices, RelationType.UNBIND);
    return squad;
  }
}
