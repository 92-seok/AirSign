import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 레거시 jhlog 테이블 — 송출/통신 이력.
 * PK 명시 안 되어 있어 가상 행 번호로 대응 (rowid 같은 효과).
 */
@Entity('jhlog')
@Index('IDX_jhlog_equip_date', ['jhECode', 'jhDate'])
export class JhLog {
  // 실제 PK는 없음. typeorm 매핑 위해 가상 키 (rowid 비슷한 역할)
  // 단, 표시는 JHECode + JHDate로 식별
  @PrimaryGeneratedColumn({ name: '_virtual_id' })
  virtualId!: number;

  @Column({ name: 'JHECode', type: 'int', nullable: true })
  jhECode!: number | null;

  @Column({ name: 'JHDate', type: 'varchar', length: 50, nullable: true })
  jhDate!: string | null;

  @Column({ name: 'JHType', type: 'varchar', length: 50, nullable: true })
  jhType!: string | null;

  @Column({ name: 'JHContent', type: 'text', nullable: true })
  jhContent!: string | null;

  @Column({ name: 'JHLog', type: 'varchar', length: 255, nullable: true })
  jhLog!: string | null;
}
