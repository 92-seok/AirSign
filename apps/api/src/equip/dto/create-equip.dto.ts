import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateEquipDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  port?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  subIp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  lat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  lng?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  weather?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  air?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bright?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  volume?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firmware?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  onOff?: string;
}
