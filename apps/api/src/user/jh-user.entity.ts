import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 레거시 jhuser 테이블 매핑 (실제 스키마 기준).
 *
 *   PK: JHUCode (int unsigned, auto increment)
 *   로그인 식별자: JHID (varchar 50) — 인덱스 없으나 데이터량 적음
 *   비밀번호: JHPw (varchar 255) — 레거시는 md5 32자 hex, 점진 bcrypt(60자)로 마이그레이션
 *   권한: JHDegree (varchar 10) — 'admin' | 'User' 등
 *   루트여부: JHRoot (varchar 10) — 'Y' | 'N'
 */
@Entity('jhuser')
@Index('IDX_jhuser_jhid', ['jhId'])
export class JhUser {
  @PrimaryGeneratedColumn({ name: 'JHUCode', type: 'int', unsigned: true })
  jhUCode!: number;

  @Column({ name: 'JHID', type: 'varchar', length: 50, nullable: true })
  jhId!: string | null;

  @Column({ name: 'JHPw', type: 'varchar', length: 255, nullable: true })
  jhPw!: string | null;

  @Column({ name: 'JHName', type: 'varchar', length: 30, nullable: true })
  jhName!: string | null;

  @Column({ name: 'JHRoot', type: 'varchar', length: 10, nullable: true })
  jhRoot!: string | null;

  @Column({ name: 'JHRootID', type: 'varchar', length: 50, nullable: true })
  jhRootID!: string | null;

  @Column({ name: 'JHDegree', type: 'varchar', length: 10, nullable: true })
  jhDegree!: string | null;

  @Column({ name: 'JHLogoImage', type: 'varchar', length: 100, nullable: true })
  jhLogoImage!: string | null;

  @Column({ name: 'JHUseDT', type: 'varchar', length: 255, nullable: true })
  jhUseDT!: string | null;

  @Column({ name: 'JHLat', type: 'varchar', length: 50, nullable: true })
  jhLat!: string | null;

  @Column({ name: 'JHLong', type: 'varchar', length: 50, nullable: true })
  jhLong!: string | null;
}
