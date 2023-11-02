import { TestingModule, Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';
import { faker } from '@faker-js/faker';
import { UserType } from './user-type.enum';

describe('UsersService', () => {
  let service: UsersService;
  let fakeUsersModel: Partial<Model<User>> = {};

  beforeAll(async () => {
    fakeUsersModel = {
      create: (user) => {
        return Promise.resolve(user);
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: fakeUsersModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash a password', async () => {
    const mockData = {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      type: UserType.POLICE,
    };

    const user = await service.create(mockData);
    expect(user.password.split('.').length).toEqual(2);
  });
});
