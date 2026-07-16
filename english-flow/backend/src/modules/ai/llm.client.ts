import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseModelJson } from './json-repair';

/**
 * Жёсткое требование JSON-only, добавляется к system-промпту любого вызова.
 */
const JSON_ONLY_SUFFIX =
  '\n\nФОРМАТ ОТВЕТА: верни РОВНО один валидный JSON-объект и ничего больше. ' +
  'Начни ответ с символа "{" и закончи "}". Не используй markdown, ' +
  'блоки ```json, комментарии или любой текст вне JSON. ' +
  'Все переводы строк внутри строковых значений экранируй как \\n.';

/** HTTP-статусы, при которых имеет смысл повторить запрос (временные сбои провайдера). */
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504, 529]);

/** Максимум повторных попыток после первой неудачной (итого до 4 попыток). */
const MAX_RETRIES = 3;

/**
 * Диапазоны задержки перед попытками 2, 3, 4 (индекс = номер уже сделанной
 * неудачной попытки, начиная с 0). Джиттер — случайное значение внутри
 * диапазона, чтобы параллельные запросы не били провайдера синхронной волной.
 */
const RETRY_DELAY_RANGES_MS: [number, number][] = [
  [800, 1200],
  [2000, 3000],
  [5000, 7000],
];

function jitteredDelay(attemptIndex: number): number {
  const [min, max] =
    RETRY_DELAY_RANGES_MS[
      Math.min(attemptIndex, RETRY_DELAY_RANGES_MS.length - 1)
    ];
  return min + Math.random() * (max - min);
}

/** Парсит заголовок Retry-After (секунды или HTTP-дата) в миллисекунды. */
function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const diff = date - Date.now();
    return diff > 0 ? diff : 0;
  }
  return undefined;
}

/**
 * Ошибка вызова LLM с метаданными для решения "повторять или нет" и для
 * прозрачной отчётности (providerStatus/retryCount) наружу, в AiService.
 */
export class LlmCallError extends Error {
  readonly providerStatus?: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  retryCount: number;

  constructor(
    message: string,
    opts: {
      providerStatus?: number;
      retryable: boolean;
      retryAfterMs?: number;
      retryCount?: number;
    },
  ) {
    super(message);
    this.name = 'LlmCallError';
    this.providerStatus = opts.providerStatus;
    this.retryable = opts.retryable;
    this.retryAfterMs = opts.retryAfterMs;
    this.retryCount = opts.retryCount ?? 0;
  }
}

export interface LastCallMeta {
  retryCount: number;
  providerStatus?: number;
}

/**
 * Транспортный слой для LLM-провайдеров.
 * Поддерживает OpenAI-совместимые endpoints (openai, anthropic-compatible)
 * и Anthropic Messages API. Провайдер выбирается через переменные окружения:
 * AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_BASE_URL.
 *
 * Все ответы ожидаются в JSON. Для повышения доли валидного JSON:
 *  - system-промпт усиливается требованием JSON-only;
 *  - OpenAI: response_format={type:'json_object'} (нативный JSON-режим);
 *  - Anthropic: префилл ответа символом "{" (модель обязана продолжить JSON);
 *  - разбор идёт через устойчивый parseModelJson (fences → вырезка → ремонт).
 *
 * Временные сбои провайдера (429/502/503/504/529, сетевые ошибки, таймаут)
 * автоматически повторяются с экспоненциальной задержкой и джиттером —
 * см. RETRY_DELAY_RANGES_MS. Невалидный JSON после ремонта НЕ повторяется:
 * это ошибка содержимого ответа, а не временный сбой сети/провайдера.
 *
 * Если реальный провайдер не настроен, isConfigured=false и вызывающий код
 * обязан использовать явно помеченный дев-фолбэк.
 */
@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);
  private readonly provider: string;
  private readonly apiKey?: string;
  private readonly model?: string;
  private readonly baseUrl?: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  /** Метаданные последнего вызова chatRaw/chatJson — читает AiService.withFallback. */
  lastCallMeta: LastCallMeta | null = null;

  constructor(config: ConfigService) {
    this.provider = (config.get<string>('AI_PROVIDER') ?? 'mock')
      .trim()
      .toLowerCase();
    this.apiKey = config.get<string>('AI_API_KEY');
    this.model = config.get<string>('AI_MODEL');
    this.baseUrl = config.get<string>('AI_BASE_URL') || undefined;
    this.temperature = Number(config.get('AI_TEMPERATURE') ?? 0.4);
    this.maxTokens = Number(config.get('AI_MAX_TOKENS') ?? 4096);
    this.timeoutMs = Number(config.get('AI_TIMEOUT_MS') ?? 60_000);

    if (this.isConfigured) {
      this.logger.log(
        `Реальный AI-провайдер активирован: ${this.provider}, модель ${this.model}`,
      );
    } else {
      this.logger.warn(
        'AI_PROVIDER/AI_API_KEY/AI_MODEL не заданы — ответы ИИ работают в дев-режиме (fallback)',
      );
    }
  }

  get isConfigured(): boolean {
    return (
      ['openai', 'anthropic', 'anthropic-compatible'].includes(this.provider) &&
      !!this.apiKey &&
      !!this.model
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Один сетевой вызов провайдера, без повторов. Бросает LlmCallError с
   * providerStatus/retryable/retryAfterMs при HTTP-ошибке или сетевом сбое.
   */
  private async callOnce(system: string, user: string): Promise<string> {
    const systemWithFormat = system + JSON_ONLY_SUFFIX;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (this.provider === 'anthropic') {
        const baseUrl = this.baseUrl ?? 'https://api.anthropic.com';
        let response: Response;
        try {
          response = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey!,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: this.model,
              max_tokens: this.maxTokens,
              temperature: this.temperature,
              system: systemWithFormat,
              // Префилл: модель обязана продолжить JSON начиная с "{".
              messages: [
                { role: 'user', content: user },
                { role: 'assistant', content: '{' },
              ],
            }),
          });
        } catch (networkError) {
          throw this.toNetworkError(networkError);
        }
        if (!response.ok) {
          throw await this.toHttpError(response, 'Anthropic API');
        }
        const data = (await response.json()) as {
          content?: { type: string; text?: string }[];
        };
        const text = data.content?.find((c) => c.type === 'text')?.text;
        if (text === undefined || text === null) {
          throw new LlmCallError('Anthropic API: пустой ответ', {
            providerStatus: response.status,
            retryable: false,
          });
        }
        // Возвращаем префилл обратно, чтобы получить полный JSON.
        return '{' + text;
      }

      // openai | anthropic-compatible → OpenAI chat/completions
      const baseUrl = this.baseUrl ?? 'https://api.openai.com/v1';
      const body: Record<string, unknown> = {
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: systemWithFormat },
          { role: 'user', content: user },
        ],
      };
      // Нативный JSON-режим поддерживается OpenAI; для anthropic-compatible
      // шлюзов он может быть не реализован — включаем только для openai.
      if (this.provider === 'openai') {
        body.response_format = { type: 'json_object' };
      }
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });
      } catch (networkError) {
        throw this.toNetworkError(networkError);
      }
      if (!response.ok) {
        throw await this.toHttpError(response, 'LLM API');
      }
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new LlmCallError('LLM API: пустой ответ', {
          providerStatus: response.status,
          retryable: false,
        });
      }
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  private async toHttpError(
    response: Response,
    label: string,
  ): Promise<LlmCallError> {
    const bodyText = (await response.text()).slice(0, 300);
    return new LlmCallError(`${label}: HTTP ${response.status} ${bodyText}`, {
      providerStatus: response.status,
      retryable: RETRYABLE_STATUS_CODES.has(response.status),
      retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
    });
  }

  /** AbortError (наш таймаут) и сетевые сбои (DNS/соединение) — временные, повторяем. */
  private toNetworkError(error: unknown): LlmCallError {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const message = error instanceof Error ? error.message : String(error);
    return new LlmCallError(
      isAbort
        ? `Таймаут запроса к LLM (${this.timeoutMs}мс)`
        : `Сетевая ошибка LLM: ${message}`,
      { retryable: true },
    );
  }

  /**
   * Запрос к LLM с автоматическими повторами при временных сбоях
   * (429/502/503/504/529, таймаут, сетевая ошибка). Невалидный статус вне
   * этого списка (400/401/403 и т.д.) не повторяется — сразу пробрасывается.
   */
  private async chatRaw(system: string, user: string): Promise<string> {
    if (!this.isConfigured) {
      this.lastCallMeta = null;
      throw new Error('LLM-провайдер не настроен');
    }
    const maxAttempts = 1 + MAX_RETRIES;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const text = await this.callOnce(system, user);
        this.lastCallMeta = { retryCount: attempt };
        return text;
      } catch (err) {
        const callError =
          err instanceof LlmCallError
            ? err
            : new LlmCallError(
                err instanceof Error ? err.message : String(err),
                { retryable: false },
              );
        const isLastAttempt = attempt === maxAttempts - 1;
        if (!callError.retryable || isLastAttempt) {
          callError.retryCount = attempt;
          this.lastCallMeta = {
            retryCount: attempt,
            providerStatus: callError.providerStatus,
          };
          throw callError;
        }
        const delay = callError.retryAfterMs ?? jitteredDelay(attempt);
        this.logger.warn(
          `LLM-вызов не удался (попытка ${attempt + 1}/${maxAttempts}, ` +
            `статус=${callError.providerStatus ?? 'сеть/таймаут'}), повтор через ${Math.round(delay)}мс`,
        );
        await this.sleep(delay);
      }
    }
    // Недостижимо: цикл либо возвращает text, либо бросает на последней попытке.
    throw new LlmCallError('LLM: исчерпаны попытки', { retryable: false });
  }

  /** Совместимость: сырой текстовый запрос (ответ ожидается как JSON). */
  async chatText(system: string, user: string): Promise<string> {
    return this.chatRaw(system, user);
  }

  /**
   * Запрос с разбором JSON-ответа через устойчивый парсер с ремонтом.
   * Перед тем как признать разбор неуспешным, логирует первые 500 символов
   * сырого ответа модели (для диагностики) и бросает обычную Error (НЕ
   * LlmCallError) — это сигнал AiService.withFallback, что причина fallback
   * не сетевая/провайдерская, а невалидный JSON, и повторять не нужно.
   */
  async chatJson<T>(system: string, user: string): Promise<T> {
    const raw = await this.chatRaw(system, user);
    const parsed = parseModelJson(raw);
    if (parsed === undefined) {
      this.logger.warn(
        `LLM вернул невалидный JSON (первые 500 символов сырого ответа): ${raw
          .slice(0, 500)
          .replace(/\s+/g, ' ')}`,
      );
      throw new Error('Ответ LLM не удалось разобрать как JSON');
    }
    return parsed as T;
  }
}
