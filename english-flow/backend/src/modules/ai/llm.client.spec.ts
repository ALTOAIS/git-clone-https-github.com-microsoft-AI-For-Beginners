import { ConfigService } from '@nestjs/config';
import { LlmClient } from './llm.client';

/**
 * Строит LlmClient с поддельным ConfigService, читающим значения из карты.
 * Отсутствующие ключи возвращают undefined (как реальный ConfigService).
 */
function makeClient(env: Record<string, string | undefined>): LlmClient {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new LlmClient(config);
}

describe('LlmClient.isConfigured', () => {
  it('true, когда заданы все три переменные (openai)', () => {
    const client = makeClient({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'sk-test',
      AI_MODEL: 'gpt-4o-mini',
    });
    expect(client.isConfigured).toBe(true);
  });

  it('true, когда заданы все три переменные (anthropic)', () => {
    const client = makeClient({
      AI_PROVIDER: 'anthropic',
      AI_API_KEY: 'sk-ant-test',
      AI_MODEL: 'claude-haiku-4-5-20251001',
    });
    expect(client.isConfigured).toBe(true);
  });

  it('true для anthropic-compatible со всеми переменными', () => {
    const client = makeClient({
      AI_PROVIDER: 'anthropic-compatible',
      AI_API_KEY: 'key',
      AI_MODEL: 'some-model',
    });
    expect(client.isConfigured).toBe(true);
  });

  it('false, когда отсутствует AI_MODEL', () => {
    const client = makeClient({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'sk-test',
    });
    expect(client.isConfigured).toBe(false);
  });

  it('false, когда отсутствует AI_API_KEY', () => {
    const client = makeClient({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-4o-mini',
    });
    expect(client.isConfigured).toBe(false);
  });

  it('false при AI_PROVIDER=mock', () => {
    const client = makeClient({
      AI_PROVIDER: 'mock',
      AI_API_KEY: 'sk-test',
      AI_MODEL: 'gpt-4o-mini',
    });
    expect(client.isConfigured).toBe(false);
  });

  it('false при неизвестном AI_PROVIDER', () => {
    const client = makeClient({
      AI_PROVIDER: 'gemini',
      AI_API_KEY: 'sk-test',
      AI_MODEL: 'gemini-pro',
    });
    expect(client.isConfigured).toBe(false);
  });

  it('false, когда переменные ИИ не заданы вовсе (дефолт mock)', () => {
    const client = makeClient({});
    expect(client.isConfigured).toBe(false);
  });

  it('нормализует регистр и пробелы в AI_PROVIDER', () => {
    const client = makeClient({
      AI_PROVIDER: '  Anthropic ',
      AI_API_KEY: 'key',
      AI_MODEL: 'claude-sonnet-5',
    });
    expect(client.isConfigured).toBe(true);
  });
});
