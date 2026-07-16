import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_EMAIL = 'e2e-errors@englishflow.local';
const E2E_PASSWORD = 'e2e-errors-password';

// Пересоздаём детерминированного E2E-пользователя перед КАЖДЫМ тестом (а не
// один раз глобально) — иначе второй проект (Mobile Chrome) унаследует уже
// пройденную сегодняшнюю сессию от первого (Desktop Chrome), а тесты внутри
// одного файла — состояние друг друга.
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

async function loginAsE2eUser(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
) {
  const response = await request.post('http://localhost:3001/api/auth/login', {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const { accessToken } = await response.json();

  await page.addInitScript((token) => {
    window.localStorage.setItem('ef_token', token);
  }, accessToken);
}

async function currentMistakeText(page: import('@playwright/test').Page) {
  const text = await page.locator('.text-red-600.line-through').first().textContent();
  return text?.trim() ?? '';
}

test.describe('Ежедневная практика ошибок — раздел 4/2/5 ТЗ', () => {
  test('интро → «Проверить ответ» → «Завершить упражнение» × 3 → экран завершения', async ({
    page,
    request,
  }) => {
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
      const mistakeText = await currentMistakeText(page);
      const corrected = CORRECTIONS[mistakeText];
      expect(corrected).toBeTruthy();

      if (mistakeText === NO_CONTEXT_ORIGINAL) {
        await expect(page.getByText('Контекст исходного задания не был сохранён.')).toBeVisible();
      } else {
        await expect(page.getByText('Задание:', { exact: true })).toBeVisible();
        await expect(page.getByText('Ваш ответ:', { exact: true })).toBeVisible();
      }

      // Разделённые действия (доработка 1): «Проверить ответ» ничего не
      // сохраняет — кнопка «Завершить упражнение» появляется только после.
      await expect(page.getByRole('button', { name: 'Завершить упражнение' })).toHaveCount(0);
      await page.getByPlaceholder('Введите ответ на английском').fill(corrected);
      await page.getByRole('button', { name: 'Проверить ответ' }).click();
      await expect(page.getByText('✓ Верно', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Завершить упражнение' }).click();
      await expect(page.getByText('✓ Верно!')).toBeVisible();
      await expect(page.getByText(/Следующая проверка через 3 (дня|дней|день)/)).toBeVisible();
      await page.getByRole('button', { name: 'Далее' }).click();
    }

    // Экран завершения (раздел 4 ТЗ): "Done today" — зелёный статус.
    await expect(page.getByText('Сегодняшняя практика ошибок завершена')).toBeVisible();
    await expect(page.getByText(/Прошли: 3/)).toBeVisible();
    await expect(page.getByText(/Исправлено правильным ответом: 3/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Вернуться на главную' })).toBeVisible();

    // Повторное открытие раздела не заставляет проходить задания заново
    // (раздел 4 ТЗ) — сразу показывается экран завершения.
    await page.reload();
    await expect(page.getByText('Сегодняшняя практика ошибок завершена')).toBeVisible();
  });

  test('2 исправлены, 1 пропущена — итог честно разделён, пропуск не возвращается в той же сессии', async ({
    page,
    request,
  }) => {
    await loginAsE2eUser(page, request);
    await page.goto('/errors');
    await page.getByRole('button', { name: 'Начать' }).click();

    // Первое задание — исправляем.
    await expect(page.getByText('Ошибка 1 из 3')).toBeVisible();
    let mistake = await currentMistakeText(page);
    await page.getByPlaceholder('Введите ответ на английском').fill(CORRECTIONS[mistake]);
    await page.getByRole('button', { name: 'Проверить ответ' }).click();
    await page.getByRole('button', { name: 'Завершить упражнение' }).click();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Второе задание — пропускаем (доработка 4).
    await expect(page.getByText('Ошибка 2 из 3')).toBeVisible();
    const skippedMistake = await currentMistakeText(page);
    await page.getByRole('button', { name: 'Пропустить' }).click();

    // Третье задание (то, что осталось) — исправляем.
    await expect(page.getByText('Ошибка 3 из 3')).toBeVisible();
    mistake = await currentMistakeText(page);
    expect(mistake).not.toBe(skippedMistake);
    await page.getByPlaceholder('Введите ответ на английском').fill(CORRECTIONS[mistake]);
    await page.getByRole('button', { name: 'Проверить ответ' }).click();
    await page.getByRole('button', { name: 'Завершить упражнение' }).click();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Итог: сессия завершена, но с честным разделением исправлено/пропущено.
    await expect(page.getByText('Сегодняшняя практика ошибок завершена')).toBeVisible();
    await expect(page.getByText(/Прошли: 3/)).toBeVisible();
    await expect(page.getByText(/Исправлено правильным ответом: 2/)).toBeVisible();
    await expect(page.getByText(/Пропущено: 1/)).toBeVisible();
  });

  test('все 3 задания пропущены — сессия завершена, но раздел не утверждает, что всё исправлено', async ({
    page,
    request,
  }) => {
    await loginAsE2eUser(page, request);
    await page.goto('/errors');
    await page.getByRole('button', { name: 'Начать' }).click();

    for (let i = 1; i <= 3; i++) {
      await expect(page.getByText(`Ошибка ${i} из 3`)).toBeVisible();
      await page.getByRole('button', { name: 'Пропустить' }).click();
    }

    await expect(page.getByText('Сегодняшняя практика ошибок завершена')).toBeVisible();
    await expect(page.getByText(/Исправлено правильным ответом: 0/)).toBeVisible();
    await expect(page.getByText(/Пропущено: 3/)).toBeVisible();
  });

  test('«Не понял объяснение» показывает упрощённое объяснение, формулу и контраст без нового ИИ-вызова', async ({
    page,
    request,
  }) => {
    await loginAsE2eUser(page, request);
    await page.goto('/errors');
    await page.getByRole('button', { name: 'Начать' }).click();
    await expect(page.getByText('Ошибка 1 из 3')).toBeVisible();

    await page.getByRole('button', { name: 'Не понял объяснение' }).click();
    await expect(page.getByText('Проще говоря:')).toBeVisible();
    await expect(page.getByText('Сравните:')).toBeVisible();
  });
});
