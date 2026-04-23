import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionOption } from '../../model/entities/interfaces';

export class UpdateQuestionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() questionText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() questionLatex?: string;
  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  options?: QuestionOption[];
  @ApiPropertyOptional() @IsOptional() @IsString() answer?: string;
}
