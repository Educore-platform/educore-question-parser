import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiProcessedQuestionsService } from './ai-processed-questions.service';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { AiProcessedQuestionFilterDto } from './dto/ai-processed-question-filter.dto';
import { UpdateAiProcessedQuestionDto } from './dto/update-ai-processed-question.dto';

@ApiTags('ai-processed-questions')
@Controller({ path: 'ai-processed-questions', version: '1' })
export class AiProcessedQuestionsController {
  constructor(private readonly service: AiProcessedQuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List AI-processed questions (paginated, filterable)' })
  findAll(@Query() filter: AiProcessedQuestionFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an AI-processed question by ID (no relations)' })
  findOne(@Param() { id }: IdParamDto) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Apply human corrections to an AI-processed question' })
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateAiProcessedQuestionDto) {
    return this.service.update(id, dto);
  }
}
