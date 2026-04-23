import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestion } from '../model/entities/exam-question.entity';
import { QuestionStatus } from '../model/entities/enums';
import {
  LatexImprovementJobPayload,
  QUEUE_NAMES,
} from '../shared/queues/queue-names';
import { LatexClassifierService } from '../extraction/services/latex-classifier.service';

@Processor(QUEUE_NAMES.LATEX_IMPROVEMENT)
export class LatexProcessor extends WorkerHost {
  private readonly logger = new Logger(LatexProcessor.name);

  constructor(
    @InjectRepository(ExamQuestion)
    private readonly questionRepo: Repository<ExamQuestion>,
    private readonly latexClassifier: LatexClassifierService,
  ) {
    super();
  }

  async process(job: Job<LatexImprovementJobPayload>): Promise<void> {
    const { questionId } = job.data;

    const question = await this.questionRepo.findOne({
      where: { id: questionId },
    });
    if (!question) {
      this.logger.error(`Question ${questionId} not found`);
      return;
    }

    this.logger.log(
      `Refining LaTeX for question ${question.questionNumber} (ID: ${questionId})`,
    );

    const questionLatex = this.latexClassifier.convertToLatex(
      question.questionText,
    );
    const options = question.options.map((opt) => ({
      ...opt,
      latex: this.latexClassifier.convertToLatex(opt.text),
    }));

    await this.questionRepo.update(questionId, {
      questionLatex,
      options,
      status: QuestionStatus.LATEX_DONE,
    });

    this.logger.log(`LaTeX improvement completed for question ${questionId}`);
  }
}
