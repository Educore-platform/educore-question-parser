import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ description: 'Subject name, e.g. "Mathematics"' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
