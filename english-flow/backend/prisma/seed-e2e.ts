/**
 * Сидирует детерминированные данные для Playwright E2E (раздел 11 ТЗ:
 * редизайн «Мои ошибки»). Отдельный скрипт от prisma/seed.ts — не трогает
 * обычные dev/demo данные, безопасно перезапускать перед каждым прогоном.
 *
 * НЕ вызывается из Dockerfile/build/start/миграций — только вручную через
 * `npm run seed:e2e`, и только при явном ALLOW_E2E_SEED=true. При
 * NODE_ENV=production запуск отклоняется безусловно (см. src/common/seed-guard.ts).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  assertE2eSeedAllowed,
  redactDatabaseUrl,
} from '../src/common/seed-guard';

assertE2eSeedAllowed();
// eslint-disable-next-line no-console
console.log(
  `[seed-e2e] Целевая БД: ${redactDatabaseUrl(process.env.DATABASE_URL)}`,
);

const prisma = new PrismaClient();

export const E2E_EMAIL = 'e2e-errors@englishflow.local';
export const E2E_PASSWORD = 'e2e-errors-password';

async function main() {
  await prisma.user.deleteMany({ where: { email: E2E_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: E2E_EMAIL,
      passwordHash: await bcrypt.hash(E2E_PASSWORD, 10),
      name: 'E2E Errors',
      currentLevel: 'A2',
      onboardingCompleted: true,
      skillProfile: { create: {} },
    },
  });

  const past = new Date(Date.now() - 60_000);

  // 1. Ошибка с полным сохранённым контекстом (раздел 2 ТЗ)
  await prisma.errorRecord.create({
    data: {
      userId: user.id,
      originalText: 'He work here.',
      correctedText: 'He works here.',
      explanation: 'В Present Simple к глаголу после he/she/it добавляется -s.',
      errorType: 'VERB_FORM',
      microCategory: 'THIRD_PERSON_SINGULAR',
      source: 'translation_trainer',
      status: 'NEW',
      practiceStatus: 'NEW',
      occurrenceCount: 1,
      nextPracticeAt: past,
      lastOccurrenceAt: past,
      sourceModule: 'trainer',
      sourcePrompt: 'Он работает здесь.',
      sourceContext: 'Тренажёр перевода · RU→EN',
      originalUserAnswer: 'He work here.',
    },
  });

  // 2. Ошибка без контекста (как будто создана до миграции) — честный фолбэк
  await prisma.errorRecord.create({
    data: {
      userId: user.id,
      originalText: 'I am agree with you.',
      correctedText: 'I agree with you.',
      explanation: '"Agree" — глагол, перед ним не нужен "am".',
      errorType: 'OTHER',
      microCategory: null,
      source: 'legacy',
      status: 'NEW',
      practiceStatus: 'NEW',
      occurrenceCount: 1,
      nextPracticeAt: past,
      lastOccurrenceAt: past,
    },
  });

  // 3. Третья ошибка, чтобы дневная цель была ровно 3/3
  await prisma.errorRecord.create({
    data: {
      userId: user.id,
      originalText: 'She go to the office every day.',
      correctedText: 'She goes to the office every day.',
      explanation: 'Present Simple: he/she/it + глагол с -s.',
      errorType: 'VERB_FORM',
      microCategory: 'THIRD_PERSON_SINGULAR',
      source: 'review',
      status: 'NEW',
      practiceStatus: 'NEW',
      occurrenceCount: 1,
      nextPracticeAt: past,
      lastOccurrenceAt: past,
      sourceModule: 'review',
      sourcePrompt: 'Она ходит в офис каждый день.',
      sourceContext: 'Повторение · translation',
      originalUserAnswer: 'She go to the office every day.',
    },
  });

  console.log(`E2E-пользователь готов: ${E2E_EMAIL} (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
