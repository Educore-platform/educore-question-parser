import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { QuestionStatus } from '../../model/entities/enums';

export class QuestionFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by exam paper ID' })
  @IsOptional()
  @IsUUID()
  examPaperId?: string;

  @ApiPropertyOptional({ description: 'Filter by subject ID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Filter by year (e.g. "2023")' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({ enum: QuestionStatus, description: 'Filter by question status' })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}
