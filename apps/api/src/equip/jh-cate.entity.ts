import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('jhcate')
export class JhCate {
  @PrimaryGeneratedColumn({ name: 'JHCCode', type: 'int', unsigned: true })
  jhCCode!: number;

  @Column({ name: 'JHUID', type: 'varchar', length: 50, nullable: true })
  jhUID!: string | null;

  @Column({ name: 'JHName', type: 'varchar', length: 255, nullable: true })
  jhName!: string | null;

  @Column({ name: 'JHOrder', type: 'int', nullable: true })
  jhOrder!: number | null;
}
