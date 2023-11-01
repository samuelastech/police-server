import { TestingModule, Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Types, isValidObjectId } from 'mongoose';
import { UserStatus, UserType } from './user-type.enum';
import { User } from './schemas/user.schema';

interface Police extends User, WorkableEntity {
  squad: string | null;
  supported?: string[];
}

interface Operator extends User, WorkableEntity {}

interface Manager extends User {}

interface WorkableEntity {
  work: string[];
  occurrences?: string[];
}

describe('UsersController', () => {
  let inMemoDb = [];
  let controller: UsersController;
  let fakeUsersService: Partial<UsersService>;

  function createUser(type: UserType) {
    return controller.create({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      type,
    });
  }

  beforeEach(async () => {
    fakeUsersService = {
      create(user) {
        const id = new Types.ObjectId();
        const { type } = user;
        if (type === UserType.POLICE) {
          const police = {
            id,
            type,
            status: UserStatus.NOT_WORKING,
            refreshToken: '',
            squad: null,
            work: [],
            supported: [],
            occurrences: [],
            ...user,
          };
          inMemoDb.push(police as Police);
          return Promise.resolve(police);
        } else if (type === UserType.OPERATOR) {
          const operator = {
            id,
            type,
            status: UserStatus.NOT_WORKING,
            refreshToken: '',
            work: [],
            occurrences: [],
            ...user,
          };
          inMemoDb.push(operator as Operator);
          return Promise.resolve(operator);
        } else {
          const manager = {
            id,
            type,
            status: UserStatus.NOT_WORKING,
            refreshToken: '',
            ...user,
          };
          inMemoDb.push(manager as Manager);
          return Promise.resolve(manager);
        }
      },

      listOne: (id: string) => {
        return Promise.resolve(
          inMemoDb.filter((user) => {
            return String(user.id) === id;
          })[0],
        );
      },

      list: () => {
        return Promise.resolve(inMemoDb);
      },

      listUsersWithNoSquads: () => {
        return Promise.resolve(
          inMemoDb.filter((user) => {
            return user.type === UserType.POLICE && !user.squad;
          }),
        );
      },

      getStats: (id: string) => {
        const user = inMemoDb.filter((user) => String(user.id) === id)[0];
        return user.type === UserType.POLICE
          ? Promise.resolve({
              work: user.work.length,
              occurrences: user.occurrences.length,
              supported: user.supported.length,
            })
          : Promise.resolve({
              work: user.work.length,
              occurrences: user.occurrences.length,
            });
      },

      delete: (id: string) => {
        inMemoDb = inMemoDb.filter((user) => {
          return String(user.id) !== id;
        });

        return Promise.resolve();
      },

      update(id: string, params) {
        const user = inMemoDb.filter((user) => {
          return String(user.id) === id;
        })[0];
        inMemoDb = inMemoDb.filter((user) => {
          return String(user.id) !== id;
        });
        Object.assign(user, params);
        inMemoDb.push(user);
        return Promise.resolve();
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a police', async () => {
    const user = await createUser(UserType.POLICE);
    expect(isValidObjectId(user.id)).toBeTruthy();
    expect(user.type).toEqual(UserType.POLICE);
    expect(user).toHaveProperty('squad');
    expect(user).toHaveProperty('supported');
  });

  it('should create an operator', async () => {
    const user = await createUser(UserType.OPERATOR);
    expect(isValidObjectId(user.id)).toBeTruthy();
    expect(user.type).toEqual(UserType.OPERATOR);
    expect(user).toHaveProperty('occurrences');
    expect(user).toHaveProperty('work');
    expect(user).not.toHaveProperty('squad');
    expect(user).not.toHaveProperty('supported');
  });

  it('should create a manager', async () => {
    const user = await createUser(UserType.MANAGER);
    expect(isValidObjectId(user.id)).toBeTruthy();
    expect(user.type).toEqual(UserType.MANAGER);
    expect(user).not.toHaveProperty('occurrences');
    expect(user).not.toHaveProperty('work');
    expect(user).not.toHaveProperty('squad');
    expect(user).not.toHaveProperty('supported');
  });

  it('should list one user', async () => {
    const createdUser = await createUser(UserType.POLICE);
    const foundUser = await controller.listOne({ id: String(createdUser.id) });
    expect(createdUser.id).toEqual(foundUser.id);
  });

  it('should list all created users', async () => {
    const users = await controller.list();
    expect(users.length).toEqual(inMemoDb.length);
  });

  it('should list all polices that have not a squad', async () => {
    const users = (await controller.listUsersWithNoSquads()) as Police[];
    for (const user of users) {
      expect(user).toHaveProperty('squad');
      expect(user.squad).toBeFalsy();
    }
  });

  it('should list the stats of a workable entity', async () => {
    const police = await createUser(UserType.POLICE);
    const policeStats = await controller.getStats({ id: String(police.id) });
    for (const property of ['work', 'occurrences', 'supported']) {
      expect(policeStats).toHaveProperty(property);
      expect(typeof policeStats[property]).toBe('number');
    }

    const operator = await createUser(UserType.OPERATOR);
    const operatorStats = await controller.getStats({
      id: String(operator.id),
    });
    for (const property of ['work', 'occurrences']) {
      expect(operatorStats).toHaveProperty(property);
      expect(typeof operatorStats[property]).toBe('number');
    }
  });

  it('should delete an user', async () => {
    const user = await createUser(UserType.POLICE);
    await controller.delete({ id: String(user.id) });
    const wasDeleted = await controller.listOne({ id: String(user.id) });
    expect(wasDeleted).toBeFalsy();
  });

  it('should update an user', async () => {
    const user = await createUser(UserType.POLICE);
    const prevEmail = user.email;
    await controller.update(
      { id: String(user.id) },
      { email: 'updated@email.com' },
    );
    expect(prevEmail).not.toEqual(user.email);
  });
});
