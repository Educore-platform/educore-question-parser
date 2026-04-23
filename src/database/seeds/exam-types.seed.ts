import { AppDataSource } from '../data-source';
import { ExamType } from '../../model/entities/exam-type.entity';

async function seedExamTypes() {
  console.log('Seeding exam types...');
  await AppDataSource.initialize();

  const examTypeRepository = AppDataSource.getRepository(ExamType);

  const examTypes = [
    { name: 'Joint Admissions and Matriculation Board', code: 'JAMB' },
    { name: 'National Examinations Council', code: 'NECO' },
    { name: 'West African Examinations Council', code: 'WAEC' },
  ];

  for (const item of examTypes) {
    const existing = await examTypeRepository.findOne({
      where: { code: item.code },
    });
    if (existing) {
      existing.name = item.name;
      await examTypeRepository.save(existing);
      console.log(`Updated exam type name: ${item.name}`);
    } else {
      const examType = examTypeRepository.create(item);
      await examTypeRepository.save(examType);
      console.log(`Created exam type: ${item.name}`);
    }
  }

  await AppDataSource.destroy();
  console.log('Exam types seeding completed.');
}

seedExamTypes().catch((error) => {
  console.error('Error seeding exam types:', error);
  process.exit(1);
});
