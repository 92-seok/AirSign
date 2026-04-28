import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 레거시 jhequip 테이블 (LED 전광판 장비) 매핑.
 *
 *   PK: JHECode (int unsigned, auto increment)
 *   조회 인덱스: JHRootId — 사용자별 장비 필터링에 사용
 *   주의: JHLastDate는 varchar('YYYY-MM-DD HH:MM:SS') — 문자열 사전식 비교 가능
 */
@Entity('jhequip')
@Index('IDX_jhequip_root', ['jhRootId'])
export class JhEquip {
  @PrimaryGeneratedColumn({ name: 'JHECode', type: 'int', unsigned: true })
  jhECode!: number;

  @Column({ name: 'JHCate', type: 'varchar', length: 50, nullable: true })
  jhCate!: string | null;

  @Column({ name: 'JHName', type: 'varchar', length: 50, nullable: true })
  jhName!: string | null;

  @Column({ name: 'JHIP', type: 'varchar', length: 50, nullable: true })
  jhIP!: string | null;

  @Column({ name: 'JHPort', type: 'varchar', length: 6, nullable: true })
  jhPort!: string | null;

  @Column({ name: 'JHSubIP', type: 'varchar', length: 50, nullable: true })
  jhSubIP!: string | null;

  @Column({ name: 'C2_Mac', type: 'varchar', length: 20, nullable: true })
  c2Mac!: string | null;

  @Column({ name: 'C10_ID', type: 'varchar', length: 20, nullable: true })
  c10Id!: string | null;

  @Column({ name: 'JHLastDate', type: 'varchar', length: 50, nullable: true })
  jhLastDate!: string | null;

  @Column({ name: 'JHLong', type: 'varchar', length: 30, nullable: true })
  jhLong!: string | null;

  @Column({ name: 'JHLat', type: 'varchar', length: 30, nullable: true })
  jhLat!: string | null;

  @Column({ name: 'JHAddr', type: 'varchar', length: 255, nullable: true })
  jhAddr!: string | null;

  @Column({ name: 'JHBright', type: 'varchar', length: 255, nullable: true })
  jhBright!: string | null;

  @Column({ name: 'JHVolume', type: 'varchar', length: 255, nullable: true })
  jhVolume!: string | null;

  @Column({
    name: 'JHDisplayType',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  jhDisplayType!: string | null;

  @Column({ name: 'JHRootId', type: 'varchar', length: 50, nullable: true })
  jhRootId!: string | null;

  @Column({ name: 'JHFirmware', type: 'varchar', length: 50, nullable: true })
  jhFirmware!: string | null;

  @Column({ name: 'JHWeather', type: 'int', nullable: true })
  jhWeather!: number | null;

  @Column({ name: 'JHAir', type: 'int', nullable: true })
  jhAir!: number | null;

  @Column({ name: 'JHOnOff', type: 'varchar', length: 10, nullable: true })
  jhOnOff!: string | null;

  @Column({ name: 'JHContent', type: 'text', nullable: true })
  jhContent!: string | null;

  @Column({ name: 'JHImage', type: 'varchar', length: 20, nullable: true })
  jhImage!: string | null;
}
