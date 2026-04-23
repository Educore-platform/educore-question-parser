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
import { QuestionsService } from './questions.service';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { QuestionFilterDto } from './dto/question-filter.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { BulkActionDto } from './dto/bulk-action.dto';

@ApiTags('questions')
@ApiBearerAuth('access-token')
@Controller({ path: 'questions', version: '1' })
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List questions (paginated, filterable)' })
  findAll(@Query() filter: QuestionFilterDto) {
    return this.questionsService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question by ID (no relations)' })
  findOne(@Param() { id }: IdParamDto) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Manually create a question' })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: 'Apply a bulk action to multiple questions' })
  bulkAction(@Body() dto: BulkActionDto) {
    return this.questionsService.bulkAction(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update editable fields of a question' })
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a question' })
  remove(@Param() { id }: IdParamDto) {
    return this.questionsService.remove(id);
  }
}
