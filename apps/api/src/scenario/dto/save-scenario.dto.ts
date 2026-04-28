import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * 시나리오 등록/수정 공용 DTO. 큰 틀에서 read 가능한 기본 필드만 포함.
 * ST별 상세 입력(예: 텍스트+색상, 동영상 파일 등)은 다음 단계 빌더에서 추가.
 */
export class SaveScenarioDto {
  /** ST_001 ~ ST_010 */
  @IsString()
  @Matches(/^ST_\d{3}$/, { message: 'typeCode는 ST_NNN 형식' })
  typeCode!: string;

  @IsInt()
  @Min(0)
  equipCode!: number;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderby?: number;

  /** YYYY-MM-DD HH:MM:SS */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  viewData?: string;

  @IsOptional()
  @IsString()
  text?: string;
}
