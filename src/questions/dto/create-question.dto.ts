import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionOption } from '../../model/entities/interfaces';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Exam paper UUID' })
  @IsUUID()
  examPaperId: string;

  @ApiProperty({ description: 'Subject UUID' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Exam year, e.g. "2023"' })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiProperty({ description: 'Question number within the paper', minimum: 1 })
  @IsInt()
  @Min(1)
  questionNumber: number;

  @ApiProperty({ description: 'Plain-text question stem' })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiPropertyOptional({ description: 'LaTeX representation of the question (optional)' })
  @IsOptional()
  @IsString()
  questionLatex?: string;

  @ApiProperty({ description: 'Array of answer options', type: 'array' })
  @IsArray()
  options: QuestionOption[];

  @ApiPropertyOptional({ description: 'Correct answer label, e.g. "A"' })
  @IsOptional()
  @IsString()
  answer?: string;
}
