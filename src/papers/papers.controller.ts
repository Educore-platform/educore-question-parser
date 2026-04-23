import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PapersService } from './papers.service';
import { UploadPapersBodyDto } from './dto/upload-papers.dto';
import { GetPaperQuestionsQueryDto } from './dto/pagination-query.dto';
import { IdParamDto } from '../shared/dto/id-param.dto';
import { ExamPaperFilterDto } from './dto/exam-paper-filter.dto';
import { UpdateExamPaperDto } from './dto/update-exam-paper.dto';

@ApiTags('papers')
@ApiBearerAuth('access-token')
@Controller({ path: 'papers', version: '1' })
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload one or multiple PDF exam papers' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Array of PDF files and corresponding metadata',
    schema: {
      type: 'object',
      required: ['files', 'items'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        items: {
          type: 'string',
          description:
            'JSON array string containing CreatePaperDto items matching the order of the files',
          example: '[{"examTypeId": "uuid", "subjectId": "uuid"}]',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadPapersBodyDto,
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }
    if (body.items.length !== files.length) {
      throw new BadRequestException(
        `items length (${body.items.length}) must match files length (${files.length})`,
      );
    }

    return Promise.all(
      files.map((file, index) =>
        this.papersService.createPaper(file, body.items[index]),
      ),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List exam papers (paginated, filterable)' })
  findAll(@Query() filter: ExamPaperFilterDto) {
    return this.papersService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single exam paper by ID (no relations)' })
  findOne(@Param() { id }: IdParamDto) {
    return this.papersService.findOne(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get processing status of an exam paper' })
  async getPaperStatus(@Param('id') id: string) {
    return this.papersService.getPaperStatus(id);
  }

  @Get(':id/questions')
  @ApiOperation({
    summary: 'List paginated questions for a paper',
    description:
      'Returns a paginated list of extracted questions. Use `page` and `pageSize` to navigate, and `year` to filter by exam year.',
  })
  async getPaperQuestions(
    @Param('id') id: string,
    @Query() query: GetPaperQuestionsQueryDto,
  ) {
    return this.papersService.getPaperQuestions(id, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update editable fields of an exam paper' })
  update(@Param() { id }: IdParamDto, @Body() dto: UpdateExamPaperDto) {
    return this.papersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an exam paper' })
  remove(@Param() { id }: IdParamDto) {
    return this.papersService.remove(id);
  }
}
