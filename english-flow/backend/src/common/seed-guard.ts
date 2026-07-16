/**
 * Защита от случайного запуска E2E-сида (prisma/seed-e2e.ts) вне
 * контролируемого окружения. Используется ТОЛЬКО этим скриптом — обычное
 * приложение (Dockerfile CMD, build, start, миграции) его не импортирует
 * и не вызывает.
 */
export function assertE2eSeedAllowed(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'prisma/seed-e2e.ts запрещён при NODE_ENV=production — это тестовый ' +
        'сидер с фиктивными данными для Playwright, а не часть деплоя.',
    );
  }
  if (env.ALLOW_E2E_SEED !== 'true') {
    throw new Error(
      'prisma/seed-e2e.ts требует явного ALLOW_E2E_SEED=true. Запуск отклонён, ' +
        'чтобы не перезаписать данные по ошибке — задайте переменную окружения ' +
        'осознанно перед вызовом npm run seed:e2e.',
    );
  }
}

/** Убирает пароль из connection string перед выводом в лог. */
export function redactDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) return '(DATABASE_URL не задан)';
  try {
    const url = new URL(databaseUrl);
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '(не удалось разобрать DATABASE_URL)';
  }
}
