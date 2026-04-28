import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('jhscentype')
export class JhScenType {
  @PrimaryColumn({ name: 'JHSTCode', type: 'varchar', length: 100 })
  jhSTCode!: string;

  @Column({ name: 'JHDisCode', type: 'varchar', length: 100, nullable: true })
  jhDisCode!: string | null;

  @Column({ name: 'JHSTName', type: 'varchar', length: 100, nullable: true })
  jhSTName!: string | null;

  @Column({ name: 'JHImage', type: 'varchar', length: 100, nullable: true })
  jhImage!: string | null;

  @Column({ name: 'JHOrder', type: 'varchar', length: 100, nullable: true })
  jhOrder!: string | null;

  @Column({ name: 'JHContent', type: 'text', nullable: true })
  jhContent!: string | null;
}
