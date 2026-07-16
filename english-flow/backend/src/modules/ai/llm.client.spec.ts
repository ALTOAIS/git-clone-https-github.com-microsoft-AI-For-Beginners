import { ConfigService } from '@nestjs/config';
import { LlmCallError, LlmClient } from './llm.client';

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

describe('LlmClient — автоматические повторы (транспортный уровень)', () => {
  const okBody = { choices: [{ message: { content: '{"ok":true}' } }] };

  function makeConfiguredClient(): LlmClient {
    return makeClient({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'sk-test',
      AI_MODEL: 'gpt-4o-mini',
    });
  }

  function jsonResponse(
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ): Response {
    const lower = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    );
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => lower[k.toLowerCase()] ?? null },
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  }

  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('529 затем успех → один повтор, retryCount=1', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(529, { type: 'overloaded_error', message: 'Overloaded' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, okBody));
    const client = makeConfiguredClient();
    jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

    const result = await client.chatJson<{ ok: boolean }>('system', 'user');
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.lastCallMeta).toEqual({ retryCount: 1 });
  });

  it('повторяющиеся 529 → попытки исчерпаны, бросает LlmCallError с retryCount=3', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(529, { type: 'overloaded_error', message: 'Overloaded' }),
    );
    const client = makeConfiguredClient();
    jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

    await expect(client.chatJson('system', 'user')).rejects.toThrow(
      LlmCallError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 первая попытка + 3 повтора
    expect(client.lastCallMeta).toEqual({ retryCount: 3, providerStatus: 529 });
  });

  it('401 → без повтора, немедленный отказ', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: 'unauthorized' }),
    );
    const client = makeConfiguredClient();
    const sleepSpy = jest
      .spyOn(client as any, 'sleep')
      .mockResolvedValue(undefined);

    await expect(client.chatJson('system', 'user')).rejects.toThrow(
      LlmCallError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleepSpy).not.toHaveBeenCalled();
    expect(client.lastCallMeta).toEqual({ retryCount: 0, providerStatus: 401 });
  });

  it('таймаут (AbortError) затем успех → повтор срабатывает', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });
    fetchMock
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(jsonResponse(200, okBody));
    const client = makeConfiguredClient();
    jest.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

    const result = await client.chatJson<{ ok: boolean }>('system', 'user');
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.lastCallMeta).toEqual({ retryCount: 1 });
  });

  it('уважает заголовок Retry-After вместо джиттера', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(429, { error: 'rate limited' }, { 'retry-after': '2' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, okBody));
    const client = makeConfiguredClient();
    const sleepSpy = jest
      .spyOn(client as any, 'sleep')
      .mockResolvedValue(undefined);

    await client.chatJson('system', 'user');
    expect(sleepSpy).toHaveBeenCalledWith(2000);
  });

  it('400 → без повтора (невалидный запрос/модель)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: 'bad request' }),
    );
    const client = makeConfiguredClient();
    const sleepSpy = jest
      .spyOn(client as any, 'sleep')
      .mockResolvedValue(undefined);

    await expect(client.chatJson('system', 'user')).rejects.toThrow(
      LlmCallError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleepSpy).not.toHaveBeenCalled();
  });
});
