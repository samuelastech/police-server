import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { SquadService } from './squad.service';
import { CreateSquadDto } from './dto/create-squad.dto';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { IdDto } from 'src/utils/id.dto';
import { InsertOrRemoveDto } from './dto/insert-or-remove.dto';

@Controller('squad')
export class SquadController {
  constructor(private readonly squadService: SquadService) {}

  @Post()
  create(@Body() squad: CreateSquadDto) {
    return this.squadService.create(squad);
  }

  @Get()
  findAll() {
    return this.squadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id) {
    return this.squadService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') { id }: IdDto, @Body() params: UpdateSquadDto) {
    return this.squadService.update(id, params);
  }

  @Delete(':id')
  remove(@Param('id') { id }: IdDto) {
    return this.squadService.remove(id);
  }

  @Post(':squadId/police/:policeId')
  insertIntoSquad(@Param() { policeId, squadId }: InsertOrRemoveDto) {
    return this.squadService.insertPolice(squadId, policeId);
  }

  @Delete(':squadId/police/:policeId')
  removeFromSquad(@Param() { policeId, squadId }: InsertOrRemoveDto) {
    return this.squadService.removePolice(squadId, policeId);
  }
}
