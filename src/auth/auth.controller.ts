import {
  Controller,
  Post,
  Req,
  UseGuards,
  Res,
  Get,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('signin')
  async signin(@Req() request: any, @Res({ passthrough: true }) response: any) {
    const { refreshToken, ...rest } = await this.authService.signin(
      request.user,
    );
    response.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return rest;
  }

  @Get('logout')
  @HttpCode(204)
  async signout(
    @Req() request: any,
    @Res({ passthrough: true }) response: any,
  ) {
    this.hasJWTCookie(request.cookies);
    response.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
    });
  }

  @Get('refresh')
  async refresh(@Req() request: any) {
    this.hasJWTCookie(request.cookies);
    const refreshToken = request.cookies['jwt'];
    const { accessToken, type } = await this.authService.refresh(refreshToken);
    return { accessToken, type };
  }

  private hasJWTCookie(cookies) {
    if (!cookies['jwt']) throw new UnauthorizedException('Sem refresh token');
  }
}
