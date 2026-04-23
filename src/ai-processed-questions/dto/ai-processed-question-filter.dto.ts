import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { AiProcessedStatus } from '../../model/entities/enums';

export class AiProcessedQuestionFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by source exam question ID' })
  @IsOptional()
  @IsUUID()
  examQuestionId?: string;

  @ApiPropertyOptional({ enum: AiProcessedStatus, description: 'Filter by AI processing status' })
  @IsOptional()
  @IsEnum(AiProcessedStatus)
  status?: AiProcessedStatus;
}
