import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import { ExamQuestion } from '../model/entities/exam-question.entity';
import { EnrichedQuestion } from '../model/entities/interfaces';
import { QuestionEnrichmentDto } from './dto/question-enrichment.dto';
import { SYSTEM_PROMPT } from './prompts/enrichment.prompt';

@Injectable()
export class AiEnrichmentService {
  private readonly logger = new Logger(AiEnrichmentService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('anthropic.apiKey'),
    });
    this.model = this.configService.getOrThrow<string>('anthropic.model');
    this.maxTokens = this.configService.getOrThrow<number>(
      'anthropic.maxTokens',
    );
  }

  async enrichQuestions(
    questions: ExamQuestion[],
  ): Promise<EnrichedQuestion[]> {
    if (!questions.length) return [];

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: this.buildPrompt(questions) }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error(`Unexpected Claude response type: ${content.type}`);
    }

    const parsed = this.parseResponse(content.text);

    if (parsed.length !== questions.length) {
      this.logger.warn(
        `Claude returned ${parsed.length} questions, expected ${questions.length}`,
      );
    }

    return parsed;
  }

  private buildPrompt(questions: ExamQuestion[]): string {
    const payload: QuestionEnrichmentDto[] = questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionLatex: q.questionLatex,
      options: q.options,
      answer: q.answer,
      year: q.year,
      subject: q.subject?.name ?? 'Unknown',
    }));

    return `Enrich the following ${payload.length} exam question(s) and return the JSON object described in your instructions.\n\n${JSON.stringify(payload, null, 2)}`;
  }

  private parseResponse(text: string): EnrichedQuestion[] {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.questions)) {
      throw new TypeError('Claude response missing "questions" array');
    }

    return parsed.questions as EnrichedQuestion[];
  }
}
