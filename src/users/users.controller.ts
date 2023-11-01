import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { IdDto } from '../utils/id.dto';
import { Serialize } from '../utils/serialize.interceptor';
import { UserDto } from './dtos/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UsersWithNoSquad } from './dtos/users-with-no-squad.dto';

@Controller('users')
// @UseGuards(AuthGuard('jwt'))
@Serialize(UserDto)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('nosquad')
  @Serialize(UsersWithNoSquad)
  listUsersWithNoSquads() {
    return this.userService.listUsersWithNoSquads();
  }

  @Get()
  list() {
    return this.userService.list();
  }

  @Get(':id')
  listOne(@Param() { id }: IdDto) {
    return this.userService.listOne(id);
  }

  @Get('stats/:id')
  getStats(@Param() { id }: IdDto) {
    return this.userService.getStats(id);
  }

  @Post()
  create(@Body() user: CreateUserDto) {
    return this.userService.create(user);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(@Param() { id }: IdDto, @Body() params: UpdateUserDto) {
    return this.userService.update(id, params);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param() { id }: IdDto) {
    this.userService.delete(id);
  }
}
