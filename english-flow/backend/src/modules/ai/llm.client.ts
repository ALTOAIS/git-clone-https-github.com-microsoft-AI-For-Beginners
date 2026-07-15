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

  /**
   * Выполняет запрос к LLM и возвращает сырой текст ответа.
   * Для Anthropic применяется префилл "{" — возвращаемый текст
   * достраивается ведущей скобкой.
   */
  private async chatRaw(system: string, user: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('LLM-провайдер не настроен');
    }
    const systemWithFormat = system + JSON_ONLY_SUFFIX;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (this.provider === 'anthropic') {
        const baseUrl = this.baseUrl ?? 'https://api.anthropic.com';
        const response = await fetch(`${baseUrl}/v1/messages`, {
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
        if (!response.ok) {
          throw new Error(
            `Anthropic API: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`,
          );
        }
        const data = (await response.json()) as {
          content?: { type: string; text?: string }[];
        };
        const text = data.content?.find((c) => c.type === 'text')?.text;
        if (text === undefined || text === null) {
          throw new Error('Anthropic API: пустой ответ');
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
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(
          `LLM API: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`,
        );
      }
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('LLM API: пустой ответ');
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Совместимость: сырой текстовый запрос (ответ ожидается как JSON). */
  async chatText(system: string, user: string): Promise<string> {
    return this.chatRaw(system, user);
  }

  /**
   * Запрос с разбором JSON-ответа через устойчивый парсер с ремонтом.
   * Перед тем как признать разбор неуспешным, логирует первые 500 символов
   * сырого ответа модели (для диагностики) и бросает ошибку — вызывающий
   * код (AiService.withFallback) уходит в детерминированный fallback.
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
