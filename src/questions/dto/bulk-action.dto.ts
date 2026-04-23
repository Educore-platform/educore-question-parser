import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionBulkAction } from '../../model/entities/enums';

export class BulkActionDto {
  @ApiProperty({
    enum: QuestionBulkAction,
    description: 'Action to apply to each question',
  })
  @IsEnum(QuestionBulkAction)
  action: QuestionBulkAction;

  @ApiProperty({
    description: 'Array of question UUIDs to act on',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  questionIds: string[];
}
