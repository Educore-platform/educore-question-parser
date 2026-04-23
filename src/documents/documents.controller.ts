import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents (paginated, filterable)' })
  findAll(@Query() filter: DocumentFilterDto) {
    return this.documentsService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID (no relations)' })
  findOne(@Param() { id }: IdParamDto) {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Delete a document (not yet implemented — Cloudinary cleanup pending)',
  })
  remove() {
    throw new HttpException(
      'Document deletion not yet implemented — Cloudinary coordination is pending',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
