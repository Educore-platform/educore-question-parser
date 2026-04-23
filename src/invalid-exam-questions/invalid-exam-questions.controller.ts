import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvalidExamQuestionsService } from './invalid-exam-questions.service';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { InvalidQuestionFilterDto } from './dto/invalid-question-filter.dto';

@ApiTags('invalid-exam-questions')
@ApiBearerAuth('access-token')
@Controller({ path: 'invalid-exam-questions', version: '1' })
export class InvalidExamQuestionsController {
  constructor(private readonly service: InvalidExamQuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List invalid exam questions (paginated)' })
  findAll(@Query() filter: InvalidQuestionFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invalid exam question by ID' })
  findOne(@Param() { id }: IdParamDto) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (cleanup) an invalid exam question record' })
  remove(@Param() { id }: IdParamDto) {
    return this.service.remove(id);
  }
}
