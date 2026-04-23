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
import { ExamTypesService } from './exam-types.service';
import { PaginationQueryDto } from '../shared/dto/pagination.dto';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { CreateExamTypeDto } from './dto/create-exam-type.dto';
import { UpdateExamTypeDto } from './dto/update-exam-type.dto';

@ApiTags('exam-types')
@ApiBearerAuth('access-token')
@Controller({ path: 'exam-types', version: '1' })
export class ExamTypesController {
  constructor(private readonly examTypesService: ExamTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all exam types (paginated)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.examTypesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exam type by ID' })
  findOne(@Param() { id }: IdParamDto) {
    return this.examTypesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new exam type' })
  create(@Body() dto: CreateExamTypeDto) {
    return this.examTypesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exam type' })
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateExamTypeDto) {
    return this.examTypesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an exam type' })
  remove(@Param() { id }: IdParamDto) {
    return this.examTypesService.remove(id);
  }
}
