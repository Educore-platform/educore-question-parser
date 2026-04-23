import { ApiProperty } from '@nestjs/swagger';

export class SubjectListItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
}
