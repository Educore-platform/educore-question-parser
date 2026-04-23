import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../shared/dto/pagination.dto';
import { DocumentType } from '../../model/entities/enums';

export class DocumentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by exam paper ID' })
  @IsOptional()
  @IsUUID()
  examPaperId?: string;

  @ApiPropertyOptional({ description: 'Filter by question ID' })
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @ApiPropertyOptional({ enum: DocumentType, description: 'Filter by document type' })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}
