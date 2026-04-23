import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamPaperStatus } from '../../model/entities/enums';

export class ExamPaperListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() status: ExamPaperStatus;
  @ApiPropertyOptional({ nullable: true }) failureReason: string | null;
  @ApiProperty() createdAt: Date;
}
