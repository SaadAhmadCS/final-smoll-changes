import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { UpdateConfigDto } from './dtos/update-config.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/decorators/role.decorator';
import { RoleGuard } from 'src/guards/role/role.guard';
import { RolesEnum } from 'src/guards/role/role.enum';
@ApiTags('Config')
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  @UseGuards(AuthGuard(), RoleGuard)
  @Roles([RolesEnum.ADMIN])
  @ApiBearerAuth()
  updateConfig(@Body() body: UpdateConfigDto) {
    return this.configService.updateConfig(body);
  }
}
