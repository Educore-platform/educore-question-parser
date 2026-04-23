import { Transform, Type, plainToInstance } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreatePaperDto } from './create-paper.dto';

function parseItemsField(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Multipart upload: send `items` as a JSON array string, one {@link CreatePaperDto} per file (same order as `files`). */
export class UploadPapersBodyDto {
  @Transform(({ value }) => {
    const parsed = parseItemsField(value);
    return plainToInstance(CreatePaperDto, parsed);
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePaperDto)
  items: CreatePaperDto[];
}
