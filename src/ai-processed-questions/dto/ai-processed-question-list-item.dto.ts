import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProcessedStatus } from '../../model/entities/enums';

export class AiProcessedQuestionListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() examQuestionId: string;
  @ApiPropertyOptional({ nullable: true }) topic: string | null;
  @ApiPropertyOptional({ nullable: true }) relatedTopic: string | null;
  @ApiProperty({ enum: AiProcessedStatus }) status: AiProcessedStatus;
  @ApiProperty() createdAt: Date;
}
