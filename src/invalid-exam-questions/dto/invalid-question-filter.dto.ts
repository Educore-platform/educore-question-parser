import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

export class InvalidQuestionFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by exam paper ID' })
  @IsOptional()
  @IsUUID()
  examPaperId?: string;
}
