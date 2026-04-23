import { IsUUID } from 'class-validator';

export class CreatePaperDto {
  @IsUUID()
  examTypeId: string;

  @IsUUID()
  subjectId: string;
}
