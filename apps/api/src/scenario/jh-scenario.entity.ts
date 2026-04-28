import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * 레거시 jhscenario 테이블 — 장비별 시나리오 인스턴스.
 *
 *   PK: JHScenCode (varchar) — 'ST_001_201021031110' 같은 타입+timestamp 형식
 *   FK 비슷한 컬럼: JHECode (장비 코드, varchar로 저장됨)
 *                   JHSTCode (시나리오 타입 코드, varchar)
 */
@Entity('jhscenario')
@Index('IDX_jhscenario_equip', ['jhECode'])
export class JhScenario {
  @PrimaryColumn({ name: 'JHScenCode', type: 'varchar', length: 100 })
  jhScenCode!: string;

  @Column({ name: 'JHECode', type: 'varchar', length: 100, nullable: true })
  jhECode!: string | null;

  @Column({ name: 'JHSTCode', type: 'varchar', length: 100, nullable: true })
  jhSTCode!: string | null;

  @Column({ name: 'JHName', type: 'varchar', length: 100, nullable: true })
  jhName!: string | null;

  @Column({ name: 'JHSContent', type: 'text', nullable: true })
  jhSContent!: string | null;

  @Column({ name: 'JHOrderby', type: 'int', nullable: true })
  jhOrderby!: number | null;

  @Column({ name: 'JHText', type: 'text', nullable: true })
  jhText!: string | null;

  @Column({ name: 'JHViewData', type: 'varchar', length: 255, nullable: true })
  jhViewData!: string | null;

  @Column({ name: 'JHUpdate', type: 'varchar', length: 10, nullable: true })
  jhUpdate!: string | null;

  @Column({ name: 'JHStartDate', type: 'varchar', length: 20, nullable: true })
  jhStartDate!: string | null;

  @Column({ name: 'JHEndDate', type: 'varchar', length: 20, nullable: true })
  jhEndDate!: string | null;
}
