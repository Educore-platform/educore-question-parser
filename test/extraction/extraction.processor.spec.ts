import { Job } from 'bullmq';
import { ExtractionProcessor } from '../../src/extraction/extraction.processor';
import { ExtractionOrchestrator } from '../../src/extraction/extraction.orchestrator';

describe('ExtractionProcessor', () => {
  it('delegates to the orchestrator with job payload', async () => {
    const orchestrator = {
      processPaper: jest.fn().mockResolvedValue(undefined),
    };

    const processor = new ExtractionProcessor(
      orchestrator as unknown as ExtractionOrchestrator,
    );

    const job = {
      data: {
        paperId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        filePath: '/data/paper.pdf',
      },
    } as Job<{ paperId: string; filePath: string }>;

    await processor.process(job);

    expect(orchestrator.processPaper).toHaveBeenCalledWith(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      '/data/paper.pdf',
    );
  });
});
