import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { createRequest } from 'node-mocks-http';
import { createMock } from '@golevelup/ts-jest';

describe('AuthController', () => {
  let controller: AuthController;
  let fakeAuthService: Partial<AuthService>;
  let fakeRequestObject;
  let fakeResponseObject;

  beforeEach(async () => {
    fakeRequestObject = () => {
      return createMock({
        cookies: {
          jwt: jest.fn().mockReturnThis(),
        },
      });
    };

    fakeResponseObject = () => {
      return createMock({
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
      });
    };

    fakeAuthService = {
      signin: () => {
        return Promise.resolve({
          accessToken: 'malokasswjrnfhdfcs',
          refreshToken: 'somdmfr3rmkddskqwksq592d,s',
          module: false,
          type: 'police',
          id: 'someid',
        });
      },

      refresh: () => {
        return Promise.resolve({
          accessToken: 'malokasswjrnfhdfcs',
          refreshToken: 'somdmfr3rmkddskqwksq592d,s',
          module: false,
          type: 'police',
          id: 'someid',
        });
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: fakeAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should sign an user in', async () => {
    const req = createRequest();
    const res = fakeResponseObject();
    await controller.signin(req, res);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'jwt',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('should sign an user out', async () => {
    const req = fakeRequestObject();
    const res = fakeResponseObject();
    await controller.signout(req, res);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
  });

  it('should refresh the accessToken', async () => {
    const req = fakeRequestObject();
    await controller.refresh(req);
  });
});
