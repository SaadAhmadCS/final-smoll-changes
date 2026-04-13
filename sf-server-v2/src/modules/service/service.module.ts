import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './service.entity';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { ServiceMemberController } from './service.member.controller';
import { ServiceAvailabilityController } from './service.availability.controller';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [TypeOrmModule.forFeature([Service]), AppConfigModule],
  controllers: [
    ServiceController,
    ServiceMemberController,
    ServiceAvailabilityController,
  ],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
