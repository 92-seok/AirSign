import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, ValidateNested } from 'class-validator';

import { SaveScenarioDto } from './save-scenario.dto';

export class GroupSendDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  equipCodes!: number[];

  @ValidateNested()
  @Type(() => SaveScenarioDto)
  scenario!: SaveScenarioDto;
}
