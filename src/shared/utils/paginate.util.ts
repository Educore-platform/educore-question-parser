import { PaginationQueryDto } from '../dto/pagination.dto';

export function paginationOptions(dto: PaginationQueryDto) {
  return {
    skip: (dto.page - 1) * dto.pageSize,
    take: dto.pageSize,
  };
}
