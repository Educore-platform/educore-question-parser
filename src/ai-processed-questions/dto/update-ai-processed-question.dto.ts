import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionOption } from '../../model/entities/interfaces';

/**
 * Human-correction fields only.
 * status and examQuestionId are never patchable via the API.
 */
export class UpdateAiProcessedQuestionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() questionText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() questionLatex?: string;
  @ApiPropertyOptional({ type: 'array' }) @IsOptional() @IsArray() options?: QuestionOption[];
  @ApiPropertyOptional() @IsOptional() @IsString() answer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() topic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relatedTopic?: string;
}
