import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Транспортный слой для LLM-провайдеров.
 * Поддерживает OpenAI-совместимые endpoints (openai, anthropic-compatible)
 * и Anthropic Messages API. Провайдер выбирается через переменные окружения:
 * AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_BASE_URL.
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
    this.maxTokens = Number(config.get('AI_MAX_TOKENS') ?? 3000);
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

  async chatText(system: string, user: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('LLM-провайдер не настроен');
    }
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
            system,
            messages: [{ role: 'user', content: user }],
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
        if (!text) throw new Error('Anthropic API: пустой ответ');
        return text;
      }

      const baseUrl = this.baseUrl ?? 'https://api.openai.com/v1';
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
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

  async chatJson<T>(system: string, user: string): Promise<T> {
    const raw = await this.chatText(system, user);
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Ответ LLM не содержит JSON-объекта');
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
}
