import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E — раздел 11 ТЗ (редизайн «Мои ошибки»).
 * Поднимает backend (NestJS, порт 3001) и frontend (Vite dev, порт 5175)
 * автоматически. Перед прогоном нужна локальная Postgres и применённые
 * миграции (см. e2e/README.md).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: '/opt/pw-browsers/chromium' } },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], launchOptions: { executablePath: '/opt/pw-browsers/chromium' } },
    },
  ],
  webServer: [
    {
      // start:dev (watch-режим через webpack) в этой песочнице не сбрасывает
      // артефакты на диск — используем обычный prod-сборочный запуск,
      // который заодно проверяет production build backend'а (раздел 11 ТЗ).
      // tsconfig.build.tsbuildinfo удаляется явно: nest-cli.json включает
      // deleteOutDir, и инкрементальный кеш tsc иначе решает, что эмитить
      // нечего, хотя dist только что стёрт.
      command: 'rm -f tsconfig.build.tsbuildinfo && npm run build && node dist/main',
      cwd: '../backend',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: 'http://localhost:5175',
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
