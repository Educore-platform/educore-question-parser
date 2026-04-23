import { ApiProperty } from '@nestjs/swagger';
import { QuestionStatus } from '../../model/entities/enums';

export class QuestionListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() questionNumber: number;
  @ApiProperty() year: string;
  @ApiProperty({ enum: QuestionStatus }) status: QuestionStatus;
  @ApiProperty() hasMedia: boolean;
  @ApiProperty() createdAt: Date;
}
