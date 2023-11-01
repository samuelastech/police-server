import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/schemas/user.schema';
import { scrypt } from '../utils/scrypt.security';

interface Tokens {
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signin(user) {
    const { refreshToken, ...rest } = await this.generateTokens(user);
    await this.userService.update(user._id, { refreshToken });
    return { refreshToken, ...rest };
  }

  async refresh(token) {
    const payload = await this.validateRefreshToken(token);
    return this.generateTokens(payload);
  }

  verify(token: Tokens) {
    try {
      if (token.accessToken) {
        this.jwtService.verify(token.accessToken, {
          secret: this.config.get<string>('JWT_ACCESS_SECRET_PASS'),
        });
        return this.jwtService.decode(token.accessToken);
      } else {
        this.jwtService.verify(token.refreshToken, {
          secret: this.config.get<string>('JWT_REFRESH_SECRET_PASS'),
        });
        return this.jwtService.decode(token.refreshToken);
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return null;
      }
    }
  }

  private async generateTokens(user) {
    const payload = { sub: user._id, type: user.type };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET_PASS'),
        expiresIn: '1h',
      }),

      refreshToken: this.jwtService.sign(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET_PASS'),
        expiresIn: '7d',
      }),

      module: user.module ? user.module : false,
      type: user.type,
      id: user._id,
    };
  }

  private async validateRefreshToken(token): Promise<User> {
    try {
      const user = await this.userService.listOneBy({ refreshToken: token });
      const payload = this.verify({ refreshToken: token });
      const decodedUser = await this.userService.listOne(payload.sub);
      if (user.email !== decodedUser.email) {
        throw new UnauthorizedException('Refresh token has a wrong payload');
      }
      return decodedUser;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid signature');
      } else if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Expired token');
      } else {
        throw new NotFoundException('User not found');
      }
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    try {
      const user = await this.userService.listOneBy({ email });
      const [salt, storedHash] = user.password.split('.');
      const hash = (await scrypt(password, salt, 32)) as Buffer;
      if (storedHash !== hash.toString('hex')) return null;
      return user;
    } catch (error) {
      return null;
    }
  }
}
