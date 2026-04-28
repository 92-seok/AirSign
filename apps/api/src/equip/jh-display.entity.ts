import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('jhdisplay')
export class JhDisplay {
  @PrimaryColumn({ name: 'JHDisCode', type: 'varchar', length: 100 })
  jhDisCode!: string;

  @Column({ name: 'JHName', type: 'varchar', length: 100, nullable: true })
  jhName!: string | null;

  @Column({ name: 'JHSizeX', type: 'varchar', length: 25, nullable: true })
  jhSizeX!: string | null;

  @Column({ name: 'JHSizeY', type: 'varchar', length: 25, nullable: true })
  jhSizeY!: string | null;
}
