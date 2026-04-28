import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';

/**
 * 24시간 시간대별 밝기·볼륨 (0~100 정수)
 * DB는 '|' 구분 string (`80|80|80|...`) 으로 저장
 */
export class UpdateBVDto {
  @IsArray()
  @ArrayMinSize(24)
  @ArrayMaxSize(24)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  bright!: number[];

  @IsArray()
  @ArrayMinSize(24)
  @ArrayMaxSize(24)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  volume!: number[];
}
