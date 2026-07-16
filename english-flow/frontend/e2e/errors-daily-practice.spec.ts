import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_EMAIL = 'e2e-errors@englishflow.local';
const E2E_PASSWORD = 'e2e-errors-password';

// Пересоздаём детерминированного E2E-пользователя перед КАЖДЫМ тестом (а не
// один раз глобально) — иначе второй проект (Mobile Chrome) унаследует уже
// пройденную сегодняшнюю сессию от первого (Desktop Chrome).
test.beforeEach(() => {
  execSync('npm run seed:e2e', {
    cwd: path.resolve(dirname, '../../backend'),
    stdio: 'inherit',
  });
});

/** Известные исправления сидированных записей (backend/prisma/seed-e2e.ts). */
const CORRECTIONS: Record<string, string> = {
  'He work here.': 'He works here.',
  'I am agree with you.': 'I agree with you.',
  'She go to the office every day.': 'She goes to the office every day.',
};

/** Ошибка без сохранённого контекста — должна показывать честный фолбэк. */
const NO_CONTEXT_ORIGINAL = 'I am agree with you.';

async function loginAsE2eUser(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const response = await request.post('http://localhost:3001/api/auth/login', {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const { accessToken } = await response.json();

  await page.addInitScript((token) => {
    window.localStorage.setItem('ef_token', token);
  }, accessToken);
}

test.describe('Ежедневная практика ошибок — раздел 4/2/5 ТЗ', () => {
  test('интро → 3 задания с контекстом → экран завершения', async ({ page, request }) => {
    await loginAsE2eUser(page, request);
    await page.goto('/errors');

    // Экран начала (раздел 4 ТЗ): точный текст с честным количеством заданий.
    await expect(
      page.getByText('Сегодняшняя практика ошибок: 3 задания · около 4 минут'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Начать' }).click();

    for (let i = 1; i <= 3; i++) {
      await expect(page.getByText(`Ошибка ${i} из 3`)).toBeVisible();

      // Контекстная карточка (раздел 2 ТЗ): либо реальный контекст, либо
      // честное сообщение об его отсутствии — никогда не выдуманный текст.
      const mistakeLocator = page.locator('.text-red-600.line-through').first();
      const mistakeText = (await mistakeLocator.textContent())?.trim() ?? '';
      const corrected = CORRECTIONS[mistakeText];
      expect(corrected).toBeTruthy();

      if (mistakeText === NO_CONTEXT_ORIGINAL) {
        await expect(page.getByText('Контекст исходного задания не был сохранён.')).toBeVisible();
      } else {
        await expect(page.getByText('Задание:', { exact: true })).toBeVisible();
        await expect(page.getByText('Ваш ответ:', { exact: true })).toBeVisible();
      }

      await page.getByPlaceholder('Введите ответ на английском').fill(corrected);
      await page.getByRole('button', { name: 'Отработано' }).click();

      await expect(page.getByText('✓ Верно!')).toBeVisible();
      await expect(
        page.getByText(/Следующая проверка через 3 (дня|дней|день)/),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Далее' }).click();
    }

    // Экран завершения (раздел 4 ТЗ): "Done today" — зелёный статус.
    await expect(page.getByText('Сегодняшняя практика ошибок завершена')).toBeVisible();
    await expect(page.getByText(/Отработано: 3/)).toBeVisible();
    await expect(page.getByText(/Исправлено правильным ответом: 3/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Вернуться на главную' })).toBeVisible();

    // Повторное открытие раздела не заставляет проходить задания заново
    // (раздел 4 ТЗ) — сразу показывается экран завершения.
    await page.reload();
    await expect(page.getByText('Сегодняшняя практика ошибок завершена')).toBeVisible();
  });
});
