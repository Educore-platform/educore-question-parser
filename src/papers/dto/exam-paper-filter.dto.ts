import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { ExamPaperStatus } from '../../model/entities/enums';

export class ExamPaperFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by exam type ID' })
  @IsOptional()
  @IsUUID()
  examTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by subject ID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ enum: ExamPaperStatus, description: 'Filter by processing status' })
  @IsOptional()
  @IsEnum(ExamPaperStatus)
  status?: ExamPaperStatus;

  @ApiPropertyOptional({ description: 'Filter by detected year (e.g. "2023")' })
  @IsOptional()
  @IsString()
  year?: string;
}
