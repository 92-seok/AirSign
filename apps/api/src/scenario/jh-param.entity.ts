import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 레거시 jhparam 테이블 — 시나리오별 동적 파라미터(LED 전광판 합성용).
 *
 * 레거시 사용 패턴:
 *   SELECT * FROM jhparam WHERE JHName LIKE '%{ScenCode}%'
 *   각 row의 JHType / JHContent 페어로 ST별 합성 데이터 구성.
 *
 * 주요 JHType 값:
 *   ST_001 (미세먼지)        : dust_color, dust_value, dust_bg, dust_gif
 *   ST_002 (기상정보)        : weather_bg, weather_bg2, weather_temp, weather_humi,
 *                               weather_dire, weather_speed
 *   ST_006 (대기정보)        : air_{key}_bg, air_{key}_value, air_{key}_color
 *                               key ∈ {pm25, pm10, no2, co, o3, so2}
 *   ST_008 (음원미세먼지)    : dust_color, dust_value, dust_movie
 */
@Entity('jhparam')
@Index('IDX_jhparam_name', ['jhName'])
export class JhParam {
  @PrimaryGeneratedColumn({ name: 'JHIdx', type: 'int' })
  jhIdx!: number;

  /** 시나리오 코드를 포함한 식별자 (예: 'ST_001_201021031110_dust_bg') */
  @Column({ name: 'JHName', type: 'varchar', length: 200, nullable: true })
  jhName!: string | null;

  /** 파라미터 키 (예: 'dust_bg', 'weather_temp') */
  @Column({ name: 'JHType', type: 'varchar', length: 100, nullable: true })
  jhType!: string | null;

  /** 파라미터 값 (이미지 경로 / 측정값 / 색상 코드 등) */
  @Column({ name: 'JHContent', type: 'text', nullable: true })
  jhContent!: string | null;
}
