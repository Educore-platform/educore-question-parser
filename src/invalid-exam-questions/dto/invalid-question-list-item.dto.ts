import { ApiProperty } from '@nestjs/swagger';

export class InvalidQuestionListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() paperId: string;
  @ApiProperty() pageNumber: number;
  @ApiProperty() rawText: string;
  @ApiProperty({ type: [String] }) errors: string[];
  @ApiProperty() createdAt: Date;
}
