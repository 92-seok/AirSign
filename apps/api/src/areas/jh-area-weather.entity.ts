import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('jharea_weather')
export class JhAreaWeather {
  @PrimaryColumn({ name: 'JHAreaCode', type: 'int' })
  jhAreaCode!: number;

  @Column({ name: 'JHDo', type: 'varchar', length: 50, nullable: true })
  jhDo!: string | null;

  @Column({ name: 'JHSi', type: 'varchar', length: 50, nullable: true })
  jhSi!: string | null;

  @Column({ name: 'JHEup', type: 'varchar', length: 50, nullable: true })
  jhEup!: string | null;

  @Column({ name: 'JHX', type: 'varchar', length: 10, nullable: true })
  jhX!: string | null;

  @Column({ name: 'JHY', type: 'varchar', length: 10, nullable: true })
  jhY!: string | null;

  @Column({ name: 'JHOnOff', type: 'varchar', length: 10, nullable: true })
  jhOnOff!: string | null;
}
