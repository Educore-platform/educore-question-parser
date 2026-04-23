import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamTypeDto {
  @ApiProperty({ description: 'Exam type name', example: 'JOINT MATRICULATION EXAMINATION' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Exam type code', example: 'JAMB' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
