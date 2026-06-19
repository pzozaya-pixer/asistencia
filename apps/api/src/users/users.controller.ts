import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SuperAdmin)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('responsables')
  @Roles(Role.SuperAdmin, Role.Responsable)
  findResponsables() {
    return this.usersService.findResponsables();
  }

  @Post()
  @Roles(Role.SuperAdmin)
  create(@Body() payload: CreateUserDto) {
    return this.usersService.create(payload);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  update(@Param('id') id: string, @Body() payload: UpdateUserDto) {
    return this.usersService.update(id, payload);
  }
}
