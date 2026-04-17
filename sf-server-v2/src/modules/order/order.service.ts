import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { Member } from '../member/member.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Pet } from '../pet/entities/pet.entity';
import { Case } from '../case/case.entity';
import { VetConsultation } from '../vet/entities/vet.consultation.entity';
import { CaseStatusEnum } from '../case/enums/case-status.enum';
import { ConsultationStatusEnum } from '../vet/enums/consultation-status.enum';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    @InjectRepository(VetConsultation)
    private readonly vetConsultationRepo: Repository<VetConsultation>,
  ) {}

  async create(memberId: string, dto: CreateOrderDto): Promise<Order> {
    const firstItem = dto.items[0];
    const type = firstItem?.type ?? 'service';
    const title =
      dto.items.length === 1
        ? firstItem.title
        : `${firstItem.title} +${dto.items.length - 1} more`;

    const order = this.orderRepo.create({
      memberId,
      type,
      title,
      total: dto.total,
      paymentIntentId: dto.paymentIntentId ?? null,
      items: dto.items,
      schedule: dto.schedule ?? null,
      status: 'pending',
    });

    const savedOrder = await this.orderRepo.save(order);

    if (type === 'service') {
      await this.createHomeServiceConsultation(memberId, dto);
    }

    return savedOrder;
  }

  private async createHomeServiceConsultation(
    memberId: string,
    dto: CreateOrderDto,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      relations: { pets: true },
    });

    // Home service visits require a pet to render properly in admin/HomeSuite.
    // For now, attach the first available pet owned by the member.
    const pet = member?.pets?.[0];
    if (!member || !pet) {
      return;
    }

    const serviceItems = dto.items.filter((item) => item.type === 'service');
    if (!serviceItems.length) {
      return;
    }

    const scheduledAt = this.parseSchedule(dto.schedule);
    const checklist = serviceItems.flatMap((item) => {
      const baseName = item.packageLabel
        ? `${item.title} (${item.packageLabel})`
        : item.title;

      const entries: Array<{ name: string; checked: boolean; price: number }> = [
        {
          name:
            item.quantity > 1 ? `${baseName} x${item.quantity}` : baseName,
          checked: false,
          price: item.unitPrice * item.quantity,
        },
      ];

      for (const addon of item.addons ?? []) {
        entries.push({
          name:
            item.quantity > 1
              ? `${addon.name} x${item.quantity}`
              : addon.name,
          checked: false,
          price: addon.price * item.quantity,
        });
      }

      return entries;
    });

    const noteLines = serviceItems
      .map((item) => item.notes?.trim())
      .filter(Boolean)
      .map((note) => ({
        note,
        author: 'Member',
        createdAt: new Date().toISOString(),
      }));

    const caseEntity = this.caseRepo.create({
      description: 'Home service order from mobile app',
      assets: [],
      notes: noteLines as any,
      serviceChecklist: checklist as any,
      customerNotReachable: false,
      status: CaseStatusEnum.PENDING,
      isEmergency: false,
      isDirectEscalated: false,
      scheduledAt,
      member: { id: memberId } as any,
      pet: { id: pet.id } as any,
    });

    const savedCase = await this.caseRepo.save(caseEntity);

    const consultation = this.vetConsultationRepo.create({
      member: { id: memberId } as any,
      status: ConsultationStatusEnum.INITIATED,
      scheduledAt,
      case: { id: savedCase.id } as any,
      vet: null,
    });

    await this.vetConsultationRepo.save(consultation);
  }

  private parseSchedule(
    schedule: CreateOrderDto['schedule'],
  ): Date | null {
    if (!schedule?.dateId || !schedule?.time) {
      return null;
    }

    const date = new Date(`${schedule.dateId}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const match = schedule.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      return date;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  async findAllByMember(memberId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneByMember(memberId: string, id: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { id, memberId },
    });
  }

  async findAllForAdmin() {
    const orders = await this.orderRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (!orders.length) return [];

    const memberIds = [...new Set(orders.map((o) => o.memberId))];
    const members = await this.memberRepo.findByIds(memberIds);
    const memberMap = new Map(members.map((m) => [m.id, { name: m.name, email: m.email }]));

    return orders.map((order) => ({
      ...order,
      member: memberMap.get(order.memberId) ?? null,
    }));
  }

  async findOneForAdmin(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
    });

    if (!order) return null;

    const member = await this.memberRepo.findOne({
      where: { id: order.memberId },
      select: ['name', 'email'],
    });

    return {
      ...order,
      member: member ?? null,
    };
  }

  async updateStatus(id: string, status: string) {
    await this.orderRepo.update(id, { status: status as OrderStatus });
    return this.findOneForAdmin(id);
  }
}
