import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateTokenDto } from './dtos/update-token.dto';
import { UserType } from './user-type.enum';
import { randomBytes } from 'crypto';
import { scrypt } from '../utils/scrypt.security';

@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  list(): Promise<User[]> {
    return this.userModel.find();
  }

  async listOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  listUsersWithNoSquads(): Promise<User[]> {
    return this.userModel.find({
      type: UserType.POLICE,
      squad: null,
    });
  }

  async listOneBy(params: Partial<User>): Promise<User> {
    const user = await this.userModel.findOne(params);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(user: CreateUserDto): Promise<User> {
    const saltedPassword = await this.hashPassword(user.password);
    user.password = saltedPassword;
    return this.userModel.create(user);
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    return salt + '.' + hash.toString('hex');
  }

  async getStats(clientId: string) {
    const user = await (this.listOne(clientId) as any);

    return user.type === UserType.POLICE
      ? {
          work: user.work.length,
          occurrences: user.occurrences.length,
          supported: user.supported.length,
        }
      : {
          work: user.work.length,
          occurrences: user.occurrences.length,
        };
  }

  async update(
    id: string,
    params: UpdateUserDto | UpdateTokenDto,
  ): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, params, {
      new: true,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
  }
}
