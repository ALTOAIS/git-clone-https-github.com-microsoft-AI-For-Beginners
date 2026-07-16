import { assertE2eSeedAllowed, redactDatabaseUrl } from './seed-guard';

describe('assertE2eSeedAllowed', () => {
  it('бросает ошибку при NODE_ENV=production, даже если ALLOW_E2E_SEED=true', () => {
    expect(() =>
      assertE2eSeedAllowed({ NODE_ENV: 'production', ALLOW_E2E_SEED: 'true' }),
    ).toThrow(/production/);
  });

  it('бросает ошибку без ALLOW_E2E_SEED=true вне production', () => {
    expect(() => assertE2eSeedAllowed({ NODE_ENV: 'development' })).toThrow(
      /ALLOW_E2E_SEED/,
    );
    expect(() =>
      assertE2eSeedAllowed({
        NODE_ENV: 'development',
        ALLOW_E2E_SEED: 'false',
      }),
    ).toThrow(/ALLOW_E2E_SEED/);
    expect(() =>
      assertE2eSeedAllowed({ NODE_ENV: 'test', ALLOW_E2E_SEED: '1' }),
    ).toThrow(/ALLOW_E2E_SEED/); // допустима только строка 'true'
  });

  it('разрешает запуск вне production с ALLOW_E2E_SEED=true', () => {
    expect(() =>
      assertE2eSeedAllowed({ NODE_ENV: 'development', ALLOW_E2E_SEED: 'true' }),
    ).not.toThrow();
    expect(() =>
      assertE2eSeedAllowed({ ALLOW_E2E_SEED: 'true' }),
    ).not.toThrow(); // NODE_ENV не задан
  });
});

describe('redactDatabaseUrl', () => {
  it('убирает пароль, оставляя хост и имя БД видимыми', () => {
    const redacted = redactDatabaseUrl(
      'postgresql://ef:super-secret@localhost:5432/english_flow?schema=public',
    );
    expect(redacted).not.toContain('super-secret');
    expect(redacted).toContain('localhost:5432');
    expect(redacted).toContain('english_flow');
  });

  it('честно сообщает, если DATABASE_URL не задан или не парсится', () => {
    expect(redactDatabaseUrl(undefined)).toMatch(/не задан/);
    expect(redactDatabaseUrl('not-a-url')).toMatch(/не удалось разобрать/);
  });
});
