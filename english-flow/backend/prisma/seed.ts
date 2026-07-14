import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SEED_PHRASES } from '../src/modules/content/seed-phrases';
import { WEEK_LESSONS } from '../src/modules/content/week-plan';

const prisma = new PrismaClient();

async function main() {
  // 1. Стартовая библиотека фраз (общая, привязывается при регистрации)
  const phraseCount = await prisma.phrase.count({ where: { source: 'SEED' } });
  if (phraseCount === 0) {
    await prisma.phrase.createMany({
      data: SEED_PHRASES.map((p) => ({
        englishText: p.english,
        russianTranslation: p.russian,
        category: p.category,
        cefrLevel: p.cefrLevel as any,
        exampleSentence: p.example,
        pronunciationHint: p.hint,
        tags: p.tags ?? [],
        source: 'SEED' as const,
      })),
    });
    console.log(`Создано фраз: ${SEED_PHRASES.length}`);
  } else {
    console.log('Сидовые фразы уже существуют — пропуск');
  }

  // 2. Семидневный учебный план (общие уроки)
  for (const lesson of WEEK_LESSONS) {
    const existing = await prisma.lesson.findFirst({
      where: { userId: null, dayNumber: lesson.dayNumber, source: 'SEED' },
    });
    if (existing) continue;
    await prisma.lesson.create({
      data: {
        title: lesson.title,
        topic: lesson.topic,
        level: lesson.level as any,
        durationMinutes: lesson.durationMinutes,
        objective: lesson.objective,
        dayNumber: lesson.dayNumber,
        contentJson: lesson.content as any,
        source: 'SEED',
        status: 'READY',
      },
    });
  }
  console.log(`Сидовые уроки: ${WEEK_LESSONS.length}`);

  // 3. Демо-пользователь (только если явно запрошен)
  if (process.env.SEED_DEMO_USER === 'true') {
    const email = 'miras@englishflow.local';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(
            process.env.SEED_DEMO_PASSWORD ?? 'english-flow-demo',
            10,
          ),
          name: 'Мирас',
          currentLevel: 'A2',
          goals: [
            'speak_freely',
            'professional_english',
            'study_abroad',
            'professional_reading',
            'career',
          ],
          preferredTopics: [
            'compliance',
            'anticorruption',
            'governance',
            'career',
          ],
          preferredLearningMethods: [
            'translation',
            'ai_speaking',
            'short_dialogues',
            'professional_topics',
          ],
          skillProfile: { create: {} },
        },
      });
      const phrases = await prisma.phrase.findMany({
        where: { source: 'SEED' },
        select: { id: true },
      });
      await prisma.userPhrase.createMany({
        data: phrases.map((p) => ({
          userId: user.id,
          phraseId: p.id,
          nextReviewAt: new Date(),
        })),
      });
      console.log(`Демо-пользователь создан: ${email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
