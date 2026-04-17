import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/role.decorator';
import { RoleGuard } from 'src/guards/role/role.guard';
import { RolesEnum } from 'src/guards/role/role.enum';
import { ConfigService as AppConfigService } from '../config/config.service';
import { IsOptional, IsString, Matches } from 'class-validator';

/** Query DTO for availability (date YYYY-MM-DD) */
export class HomeServiceAvailabilityQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be YYYY-MM-DD',
  })
  date?: string;
}

/**
 * Returns available time slots for home service booking.
 * App expects: { slots: string[] } or { data: string[] }
 * Default slots 09:00–17:00 in 1h steps; can be replaced by real scheduling later.
 */
const DEFAULT_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

@ApiTags('Service: Home Services Availability')
@Controller('/member/home-services')
@ApiBearerAuth()
@UseGuards(AuthGuard(), RoleGuard)
@Roles([RolesEnum.MEMBER])
export class ServiceAvailabilityController {
  constructor(private readonly configService: AppConfigService) {}

  @Get('availability')
  async getAvailability(
    @Query() query: HomeServiceAvailabilityQueryDto,
  ): Promise<{ slots: string[] }> {
    const config = await this.configService.getConfig();

    const daysOff: string[] = config?.homeServiceDaysOff || [];
    const overrides: Record<string, string[]> =
      config?.homeServiceOverrides || {};

    const requestedDate = query.date;

    // 1) If the date is explicitly marked as a full day off, return no slots.
    if (requestedDate && daysOff.includes(requestedDate)) {
      return { slots: [] };
    }

    // 2) If there is a per-date override, use those slots instead of defaults.
    if (requestedDate && Array.isArray(overrides[requestedDate])) {
      return { slots: overrides[requestedDate] };
    }

    // 3) Fallback to default/global slots.
    const slots: string[] =
      config?.homeServiceSlots?.length > 0
        ? config.homeServiceSlots
        : DEFAULT_SLOTS;
    return { slots };
  }
}
