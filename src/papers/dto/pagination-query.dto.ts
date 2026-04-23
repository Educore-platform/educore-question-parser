import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';

export class GetPaperQuestionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter questions by exam year',
    example: '2023',
  })
  @IsOptional()
  @IsString()
  year?: string;
}