import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('app_config')
export class AppConfig {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'jsonb', nullable: true })
  value: any;
}
