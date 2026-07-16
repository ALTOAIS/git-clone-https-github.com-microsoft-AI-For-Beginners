import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_EMAIL = 'e2e-errors@englishflow.local';
const E2E_PASSWORD = 'e2e-errors-password';
const REGRESSION_EMAIL = 'e2e-regression@englishflow.local';
const REGRESSION_PASSWORD = 'e2e-regression-password';

/**
 * Регрессия production-инцидента, обнаруженного после merge PR #33:
 * daily-session возвращала пустой список, хотя у пользователя были активные
 * NEW-ошибки (nextPracticeAt на них был унаследован из legacy-логики и
 * ошибочно трактовался как "расписание"), а общий список /errors всё ещё
 * показывал старую вёрстку карточек без контекста и честного fallback.
 */
test.beforeEach(() => {
  execSync('npm run seed:e2e', {
    cwd: path.resolve(dirname, '../../backend'),
    stdio: 'inherit',
    env: { ...process.env, ALLOW_E2E_SEED: 'true' },
  });
});

async function loginAs(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
) {
  const response = await request.post('http://localhost:3001/api/auth/login', {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const { accessToken } = await response.json();
  await page.addInitScript((token) => {
    window.localStorage.setItem('ef_token', token);
  }, accessToken);
}

test.describe('Регрессия: пустая daily-session при активных NEW-ошибках', () => {
  test('NEW-ошибка с будущим nextPracticeAt видна в daily session — пустой баннер не показывается', async ({
    page,
    request,
  }) => {
    await loginAs(page, request, REGRESSION_EMAIL, REGRESSION_PASSWORD);
    await page.goto('/errors');

    // Пустой баннер НЕ должен появляться — есть активная NEW-запись.
    await expect(
      page.getByText('Активных ошибок для практики пока нет. Отличная работа!'),
    ).toHaveCount(0);

    // Вместо этого — стартовый экран дневной сессии с ненулевым числом заданий.
    await expect(page.getByText(/Сегодняшняя практика ошибок: \d/)).toBeVisible();
  });

  test('запланированная проверка (SCHEDULED_REVIEW, будущая дата) показывает "Запланировано на" в общем списке', async ({
    page,
    request,
  }) => {
    await loginAs(page, request, REGRESSION_EMAIL, REGRESSION_PASSWORD);
    await page.goto('/errors');

    // Единственный кейс, где будущая дата легитимно скрывает запись из
    // дневной сессии (см. backend-тест "SCHEDULED_REVIEW с будущим
    // nextPracticeAt по-прежнему НЕ видна") — здесь проверяем, что общий
    // список честно объясняет пользователю, когда она вернётся.
    await expect(page.getByText(/Запланировано на/)).toBeVisible();
    await expect(page.getByText('I have went there yesterday.')).toBeVisible();
  });

  test('старая повреждённая запись (обе части русские) не входит в daily session, помечена как повреждённая и её можно удалить', async ({
    page,
    request,
  }) => {
    await loginAs(page, request, REGRESSION_EMAIL, REGRESSION_PASSWORD);
    await page.goto('/errors');

    await expect(page.getByText('Похоже, запись повреждена')).toBeVisible();
    await expect(page.getByText('поужинали')).toBeVisible();

    await page.getByRole('button', { name: 'Удалить ошибочную запись' }).click();
    await expect(page.getByText('поужинали')).toHaveCount(0);
  });

  test('старая запись без контекста показывает честный fallback вместо выдуманного контекста', async ({
    page,
    request,
  }) => {
    await loginAs(page, request, REGRESSION_EMAIL, REGRESSION_PASSWORD);
    await page.goto('/errors');

    // Записей без контекста у регрессионного пользователя две (A и C) —
    // fallback обязан появиться хотя бы один раз, .first() снимает
    // strict-mode неоднозначность.
    await expect(
      page.getByText('Контекст исходного задания не был сохранён.').first(),
    ).toBeVisible();
  });

  test('/errors использует новый формат карточки (Задание/Источник) для записей с сохранённым контекстом', async ({
    page,
    request,
  }) => {
    await loginAs(page, request, E2E_EMAIL, E2E_PASSWORD);
    await page.goto('/errors');

    // Основной E2E-пользователь: минимум одна запись с полным контекстом
    // (trainer, "Он работает здесь."), видимая либо в блоке практики, либо
    // в общем списке ниже — в обоих случаях это один и тот же ErrorContextCard.
    await expect(page.getByText('Задание:', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Источник:/).first()).toBeVisible();
  });
});
