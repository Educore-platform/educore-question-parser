import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CloudinaryStatus,
  DocumentSource,
  DocumentType,
} from '../../model/entities/enums';

export class DocumentListItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: DocumentType }) type: DocumentType;
  @ApiProperty({ enum: DocumentSource }) source: DocumentSource;
  @ApiPropertyOptional({ enum: CloudinaryStatus, nullable: true })
  cloudinaryStatus: CloudinaryStatus | null;
  @ApiPropertyOptional({ nullable: true }) examPaperId: string | null;
  @ApiProperty() createdAt: Date;
}
