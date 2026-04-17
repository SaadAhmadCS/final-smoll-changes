import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderAdminController } from './order.admin.controller';
import { Member } from '../member/member.entity';
import { Pet } from '../pet/entities/pet.entity';
import { Case } from '../case/case.entity';
import { VetConsultation } from '../vet/entities/vet.consultation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Member, Pet, Case, VetConsultation])],
  controllers: [OrderController, OrderAdminController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
