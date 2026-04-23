import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items for the current page' })
  items: T[];

  @ApiProperty({ description: 'Total number of matching records', example: 150 })
  total: number;

  @ApiProperty({ description: 'Current page number (1-based)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  pageSize: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  totalPages: number;

  @ApiProperty({ description: 'Whether a next page exists', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether a previous page exists', example: false })
  hasPrevPage: boolean;

  /**
   * Derives all pagination meta from the query DTO.
   *
   * @param items  Records for the current page (already sliced by the DB query).
   * @param total  Total count of matching records (from COUNT(*)).
   * @param query  The PaginationQueryDto (or subclass) used for this request.
   */
  static of<T>(
    items: T[],
    total: number,
    query: PaginationQueryDto,
  ): PaginatedResponseDto<T> {
    const { page, pageSize } = query;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const dto = new PaginatedResponseDto<T>();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.pageSize = pageSize;
    dto.totalPages = totalPages;
    dto.hasNextPage = page < totalPages;
    dto.hasPrevPage = page > 1;
    return dto;
  }
}