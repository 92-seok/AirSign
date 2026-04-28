import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  password!: string;
}
