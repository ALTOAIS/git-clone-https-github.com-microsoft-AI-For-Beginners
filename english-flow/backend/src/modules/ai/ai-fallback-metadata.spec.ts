import { AiService } from './ai.service';
import { LlmCallError, LlmClient } from './llm.client';

const evalInput = {
  direction: 'ru_en' as const,
  prompt: 'Скажите привет',
  expected: 'Hello',
  userAnswer: 'Hello',
  level: 'A2',
};

describe('AiService.withFallback — метаданные fallback', () => {
  it('LlmCallError после исчерпанных повторов → fallbackReason=llm_error, providerStatus, retryCount', async () => {
    const error = new LlmCallError('Overloaded', {
      providerStatus: 529,
      retryable: true,
      retryCount: 3,
    });
    const llm = {
      isConfigured: true,
      lastCallMeta: { retryCount: 3, providerStatus: 529 },
      chatJson: async () => {
        throw error;
      },
    } as unknown as LlmClient;
    const ai = new AiService(llm);

    const res = await ai.evaluateTranslation(evalInput);
    expect(res.aiMode).toBe('fallback');
    expect(res.fallbackReason).toBe('llm_error');
    expect(res.providerStatus).toBe(529);
    expect(res.retryCount).toBe(3);
  });

  it('невалидный JSON после ремонта → fallbackReason=invalid_json, без providerStatus', async () => {
    const llm = {
      isConfigured: true,
      lastCallMeta: { retryCount: 0 },
      chatJson: async () => {
        throw new Error('Ответ LLM не удалось разобрать как JSON');
      },
    } as unknown as LlmClient;
    const ai = new AiService(llm);

    const res = await ai.evaluateTranslation(evalInput);
    expect(res.aiMode).toBe('fallback');
    expect(res.fallbackReason).toBe('invalid_json');
    expect(res.providerStatus).toBeUndefined();
  });

  it('ИИ не настроен → fallbackReason=not_configured', async () => {
    const llm = { isConfigured: false } as unknown as LlmClient;
    const ai = new AiService(llm);

    const res = await ai.evaluateTranslation(evalInput);
    expect(res.aiMode).toBe('fallback');
    expect(res.fallbackReason).toBe('not_configured');
  });

  it('успех с первой попытки → retryCount=0, fallbackReason не задан', async () => {
    const llm = {
      isConfigured: true,
      lastCallMeta: { retryCount: 0 },
      chatJson: async () => ({
        verdict: 'correct',
        correctAnswer: 'Hello',
        explanation: '',
        errors: [],
      }),
    } as unknown as LlmClient;
    const ai = new AiService(llm);

    const res = await ai.evaluateTranslation(evalInput);
    expect(res.aiMode).toBe('llm');
    expect(res.retryCount).toBe(0);
    expect(res.fallbackReason).toBeUndefined();
  });

  it('успех после повторов (retryCount>0) сохраняется в результате', async () => {
    const llm = {
      isConfigured: true,
      lastCallMeta: { retryCount: 2 },
      chatJson: async () => ({
        verdict: 'correct',
        correctAnswer: 'Hello',
        explanation: '',
        errors: [],
      }),
    } as unknown as LlmClient;
    const ai = new AiService(llm);

    const res = await ai.evaluateTranslation(evalInput);
    expect(res.aiMode).toBe('llm');
    expect(res.retryCount).toBe(2);
  });
});
