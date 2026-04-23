import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { PaginationQueryDto } from '../shared/dto/pagination.dto';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@ApiTags('subjects')
@ApiBearerAuth('access-token')
@Controller({ path: 'subjects', version: '1' })
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all subjects (paginated)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.subjectsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subject by ID' })
  findOne(@Param() { id }: IdParamDto) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subject' })
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a subject' })
  remove(@Param() { id }: IdParamDto) {
    return this.subjectsService.remove(id);
  }
}
