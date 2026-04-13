import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './entities/app-config.entity';
import { UpdateConfigDto } from './dtos/update-config.dto';

@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(AppConfig)
    private readonly configRepo: Repository<AppConfig>,
  ) {}

  async onModuleInit() {
    // Ensure the default settings are seeded
    let settings = await this.configRepo.findOne({ where: { key: 'settings' } });
    if (!settings) {
      settings = this.configRepo.create({ 
        key: 'settings', 
        value: { 
          travelFee: 79.00, 
          shippingFee: 10.00,
          homeServiceSlots: [
            '09:00 AM',
            '10:00 AM',
            '11:00 AM',
            '12:00 PM',
            '01:00 PM',
            '02:00 PM',
            '03:00 PM',
            '04:00 PM',
            '05:00 PM',
          ],
          homeServiceDaysOff: []
        } 
      });
      await this.configRepo.save(settings);
    }
  }

  async getConfig(): Promise<any> {
    const settings = await this.configRepo.findOne({ where: { key: 'settings' } });
    const defaults = { 
      travelFee: 79.00, 
      shippingFee: 10.00,
      homeServiceSlots: [
        '09:00 AM',
        '10:00 AM',
        '11:00 AM',
        '12:00 PM',
        '01:00 PM',
        '02:00 PM',
        '03:00 PM',
        '04:00 PM',
        '05:00 PM',
      ],
      homeServiceDaysOff: []
    };
    return { ...defaults, ...(settings?.value || {}) };
  }

  async updateConfig(dto: UpdateConfigDto): Promise<any> {
    let settings = await this.configRepo.findOne({ where: { key: 'settings' } });
    if (!settings) {
      settings = this.configRepo.create({ key: 'settings', value: {} });
    }
    
    settings.value = { ...settings.value, ...dto };

    const saved = await this.configRepo.save(settings);
    return saved.value;
  }
}
