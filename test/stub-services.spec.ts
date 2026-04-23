import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../src/documents/documents.service';
import { CloudinaryService } from '../src/shared/cloudinary/cloudinary.service';
import { OcrService } from '../src/ocr/ocr.service';
import { AiEnrichmentService } from '../src/ai-enrichment/ai-enrichment.service';
import { AnswerMatchingService } from '../src/answer-matching/answer-matching.service';
import { LatexImprovementService } from '../src/latex/latex-improvement.service';
import { OptionParserService } from '../src/extraction/services/option-parser.service';
import { ValidatorService } from '../src/extraction/services/validator.service';
import { InvalidExamQuestionRepository } from '../src/model/repositories/invalid-exam-question.repository';
import { MediaHandlerService } from '../src/extraction/services/media-handler.service';
import { YearDetectorService } from '../src/extraction/services/year-detector.service';
import { LatexClassifierService } from '../src/extraction/services/latex-classifier.service';
import { QuestionsService } from '../src/questions/questions.service';
import { QuestionsController } from '../src/questions/questions.controller';

async function resolvesProvider<T>(
  Cls: new (...args: unknown[]) => T,
): Promise<T> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [Cls],
  }).compile();

  return module.get(Cls);
}

describe('stub services', () => {
  it.each([
    ['DocumentsService', DocumentsService],
    ['OcrService', OcrService],
    ['AiEnrichmentService', AiEnrichmentService],
    ['AnswerMatchingService', AnswerMatchingService],
    ['LatexImprovementService', LatexImprovementService],
    ['OptionParserService', OptionParserService],
    ['MediaHandlerService', MediaHandlerService],
    ['YearDetectorService', YearDetectorService],
    ['LatexClassifierService', LatexClassifierService],
    ['QuestionsService', QuestionsService],
  ])('%s can be instantiated via Nest testing module', async (_name, Cls) => {
    const instance = await resolvesProvider(Cls as new () => object);
    expect(instance).toBeDefined();
  });

  it('CloudinaryService can be instantiated with ConfigService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const map: Record<string, string> = {
                'cloudinary.cloudName': 'test',
                'cloudinary.apiKey': 'key',
                'cloudinary.apiSecret': 'secret',
              };
              return map[key] ?? '';
            },
          },
        },
      ],
    }).compile();

    expect(module.get(CloudinaryService)).toBeInstanceOf(CloudinaryService);
  });
});

describe('ValidatorService wiring', () => {
  it('can be instantiated when InvalidExamQuestionRepository is provided', async () => {
    const invalidExamRepo = {
      create: jest.fn((x: object) => x),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidatorService,
        {
          provide: InvalidExamQuestionRepository,
          useValue: invalidExamRepo,
        },
      ],
    }).compile();

    expect(module.get(ValidatorService)).toBeInstanceOf(ValidatorService);
  });
});

describe('QuestionsController', () => {
  it('resolves with QuestionsService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [QuestionsService],
    }).compile();

    const controller = module.get(QuestionsController);
    expect(controller).toBeInstanceOf(QuestionsController);
  });
});
