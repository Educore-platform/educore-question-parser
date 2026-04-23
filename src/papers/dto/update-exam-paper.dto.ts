import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExamPaperDto {
  @ApiPropertyOptional({ description: 'Exam type UUID' })
  @IsOptional()
  @IsUUID()
  examTypeId?: string;

  @ApiPropertyOptional({ description: 'Subject UUID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Human-readable title for the paper' })
  @IsOptional()
  @IsString()
  title?: string;
}
