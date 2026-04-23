import { ApiProperty } from '@nestjs/swagger';

export class ExamTypeListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
}
