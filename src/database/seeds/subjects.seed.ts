import { AppDataSource } from '../data-source';
import { Subject } from '../../model/entities/subject.entity';

async function seedSubjects() {
  console.log('Seeding subjects...');
  await AppDataSource.initialize();

  const subjectRepository = AppDataSource.getRepository(Subject);

  const DEPARTMENTS = {
    SCIENCE: 'Science',
    HUMANITIES: 'Humanities and Art',
    COMMERCIAL: 'Commercial',
  };

  const subjectsData = [
    // Science
    { name: 'Mathematics', department: DEPARTMENTS.SCIENCE, aliases: [] },
    { name: 'Physics', department: DEPARTMENTS.SCIENCE, aliases: [] },
    { name: 'Chemistry', department: DEPARTMENTS.SCIENCE, aliases: [] },
    { name: 'Biology', department: DEPARTMENTS.SCIENCE, aliases: [] },
    {
      name: 'Agricultural Science',
      department: DEPARTMENTS.SCIENCE,
      aliases: [],
    },
    {
      name: 'Further Mathematics',
      department: DEPARTMENTS.SCIENCE,
      aliases: [],
    },
    { name: 'Geography', department: DEPARTMENTS.SCIENCE, aliases: [] },
    { name: 'Technical Drawing', department: DEPARTMENTS.SCIENCE, aliases: [] },
    { name: 'Computer Studies', department: DEPARTMENTS.SCIENCE, aliases: [] },

    // Humanities and Art
    {
      name: 'English Language',
      department: DEPARTMENTS.HUMANITIES,
      aliases: [],
    },
    {
      name: 'Literature in English',
      department: DEPARTMENTS.HUMANITIES,
      aliases: [],
    },
    { name: 'Government', department: DEPARTMENTS.HUMANITIES, aliases: [] },
    {
      name: 'Christian Religious Studies',
      department: DEPARTMENTS.HUMANITIES,
      aliases: ['CRK', 'CRS'],
    },
    {
      name: 'Islamic Religious Studies',
      department: DEPARTMENTS.HUMANITIES,
      aliases: ['IRK', 'IRS'],
    },
    { name: 'History', department: DEPARTMENTS.HUMANITIES, aliases: [] },
    { name: 'French', department: DEPARTMENTS.HUMANITIES, aliases: [] },
    { name: 'Yoruba', department: DEPARTMENTS.HUMANITIES, aliases: [] },
    { name: 'Igbo', department: DEPARTMENTS.HUMANITIES, aliases: [] },
    { name: 'Hausa', department: DEPARTMENTS.HUMANITIES, aliases: [] },
    {
      name: 'Civic Education',
      department: DEPARTMENTS.HUMANITIES,
      aliases: [],
    },

    // Commercial
    { name: 'Commerce', department: DEPARTMENTS.COMMERCIAL, aliases: [] },
    { name: 'Economics', department: DEPARTMENTS.COMMERCIAL, aliases: [] },
    { name: 'Accounting', department: DEPARTMENTS.COMMERCIAL, aliases: [] },
    { name: 'Statistics', department: DEPARTMENTS.COMMERCIAL, aliases: [] },
    {
      name: 'Office Practice',
      department: DEPARTMENTS.COMMERCIAL,
      aliases: [],
    },
    { name: 'Marketing', department: DEPARTMENTS.COMMERCIAL, aliases: [] },
  ];

  for (const item of subjectsData) {
    const existing = await subjectRepository.findOne({
      where: { name: item.name, department: item.department },
    });

    if (existing) {
      // Update aliases if they changed
      existing.aliases = item.aliases;
      await subjectRepository.save(existing);
      console.log(`Subject already exists, updated aliases: ${item.name}`);
    } else {
      const subject = subjectRepository.create(item);
      await subjectRepository.save(subject);
      console.log(`Created subject: ${item.name} (${item.department})`);
    }
  }

  await AppDataSource.destroy();
  console.log('Subjects seeding completed.');
}

seedSubjects().catch((error) => {
  console.error('Error seeding subjects:', error);
  process.exit(1);
});
