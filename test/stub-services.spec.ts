import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentsService } from '../src/documents/documents.service';
import { Document } from '../src/model/entities/document.entity';
import { ExamQuestion } from '../src/model/entities/exam-question.entity';
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
import { RedisService } from '../src/shared/redis/redis.service';

function createConfigMock(
  defaults: Record<string, string | number>,
): Pick<ConfigService, 'get' | 'getOrThrow'> {
  return {
    getOrThrow: jest.fn((key: string) => {
      if (!(key in defaults)) throw new Error(`Unmocked config key: ${key}`);
      return defaults[key];
    }),
    get: jest.fn((key: string) =>
      key in defaults ? defaults[key] : undefined,
    ),
  };
}

describe('stub services — no constructor DI', () => {
  async function resolvesProvider<T>(
    Cls: new (...args: unknown[]) => T,
  ): Promise<T> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Cls],
    }).compile();
    return module.get(Cls);
  }

  it.each([
    ['OcrService', OcrService],
    ['AnswerMatchingService', AnswerMatchingService],
    ['LatexImprovementService', LatexImprovementService],
    ['OptionParserService', OptionParserService],
    ['YearDetectorService', YearDetectorService],
    ['LatexClassifierService', LatexClassifierService],
  ])('%s can be instantiated via Nest testing module', async (_name, Cls) => {
    const instance = await resolvesProvider(Cls as new () => object);
    expect(instance).toBeDefined();
  });
});

describe('stub services — ConfigService-dependent', () => {
  const CONFIG_DEFAULTS: Record<string, string | number> = {
    'anthropic.apiKey': 'test-key',
    'anthropic.model': 'claude-test',
    'anthropic.maxTokens': 1024,
    'media.dir': './tmp-test-media-stub',
  };

  it('AiEnrichmentService can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEnrichmentService,
        {
          provide: ConfigService,
          useValue: createConfigMock(CONFIG_DEFAULTS),
        },
      ],
    }).compile();

    expect(module.get(AiEnrichmentService)).toBeInstanceOf(AiEnrichmentService);
  });

  it('MediaHandlerService can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaHandlerService,
        {
          provide: ConfigService,
          useValue: createConfigMock(CONFIG_DEFAULTS),
        },
      ],
    }).compile();

    expect(module.get(MediaHandlerService)).toBeInstanceOf(MediaHandlerService);
  });

  it('CloudinaryService can be instantiated with ConfigService', async () => {
    const cloudinaryDefaults: Record<string, string | number> = {
      'cloudinary.cloudName': 'test',
      'cloudinary.apiKey': 'key',
      'cloudinary.apiSecret': 'secret',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: createConfigMock(cloudinaryDefaults),
        },
      ],
    }).compile();

    expect(module.get(CloudinaryService)).toBeInstanceOf(CloudinaryService);
  });
});

describe('stub services — repository-dependent', () => {
  const docRepo = {};
  const redisService = {
    getClient: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    })),
  };
  const examQuestionRepo = {};

  it('DocumentsService can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: docRepo },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    expect(module.get(DocumentsService)).toBeInstanceOf(DocumentsService);
  });

  it('QuestionsService can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: getRepositoryToken(ExamQuestion),
          useValue: examQuestionRepo,
        },
      ],
    }).compile();

    expect(module.get(QuestionsService)).toBeInstanceOf(QuestionsService);
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
      providers: [
        QuestionsService,
        {
          provide: getRepositoryToken(ExamQuestion),
          useValue: {},
        },
      ],
    }).compile();

    const controller = module.get(QuestionsController);
    expect(controller).toBeInstanceOf(QuestionsController);
  });
});
