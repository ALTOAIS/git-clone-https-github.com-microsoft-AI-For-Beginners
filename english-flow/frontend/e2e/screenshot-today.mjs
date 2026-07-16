import { chromium } from '@playwright/test';

const E2E_EMAIL = 'e2e-errors@englishflow.local';
const E2E_PASSWORD = 'e2e-errors-password';

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const loginRes = await context.request.post('http://localhost:3001/api/auth/login', {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  const { accessToken } = await loginRes.json();
  await page.addInitScript((token) => window.localStorage.setItem('ef_token', token), accessToken);
  await page.goto('http://localhost:5175/');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: '/tmp/errors-redesign-screenshots/7-today-page-checkmark.png',
    fullPage: true,
  });
  await browser.close();
}

main();
