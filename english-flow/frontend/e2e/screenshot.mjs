import { chromium } from '@playwright/test';

const E2E_EMAIL = 'e2e-errors@englishflow.local';
const E2E_PASSWORD = 'e2e-errors-password';
const OUT_DIR = '/tmp/errors-redesign-screenshots';

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const loginRes = await context.request.post('http://localhost:3001/api/auth/login', {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  const { accessToken } = await loginRes.json();
  await page.addInitScript((token) => window.localStorage.setItem('ef_token', token), accessToken);

  await page.goto('http://localhost:5175/errors');
  await page.waitForTimeout(800);

  // 1. "До": плоский список ошибок без daily-практики (нижняя часть страницы —
  // тот же нередактированный компонент, что был единственным UI раньше).
  await page.locator('text=Мои ошибки').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT_DIR}/1-legacy-list-before.png`, fullPage: true });

  // 2. "После": экран начала ежедневной практики.
  await page.mouse.wheel(0, 0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/2-daily-intro.png` });

  // 3. Начинаем практику — карточка с контекстом.
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/3-practice-with-context.png` });

  // 4. Отвечаем правильно на первое задание — разбор ответа.
  const CORRECTIONS = {
    'He work here.': 'He works here.',
    'I am agree with you.': 'I agree with you.',
    'She go to the office every day.': 'She goes to the office every day.',
  };
  const mistake = (await page.locator('.text-red-600.line-through').first().textContent())?.trim();
  await page.getByPlaceholder('Введите ответ на английском').fill(CORRECTIONS[mistake]);
  await page.getByRole('button', { name: 'Отработано' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/4-answer-feedback.png` });

  // Проходим оставшиеся два задания, чтобы дойти до экрана завершения.
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Далее' }).click();
    await page.waitForTimeout(400);
    const m = (await page.locator('.text-red-600.line-through').first().textContent())?.trim();
    await page.getByPlaceholder('Введите ответ на английском').fill(CORRECTIONS[m]);
    await page.getByRole('button', { name: 'Отработано' }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/5-session-complete.png` });

  // 6. Мобильный вид экрана завершения (Pixel 5 viewport).
  await page.setViewportSize({ width: 393, height: 851 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/6-session-complete-mobile.png` });

  await browser.close();
  console.log('OK: screenshots saved to', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
