import { LlmClient } from './llm.client';
import { AiService } from './ai.service';

/** Фейковый LlmClient: возвращает заданный JSON или эмулирует «не настроен». */
function aiWith(json: unknown, configured = true): AiService {
  const llm = {
    get isConfigured() {
      return configured;
    },
    chatJson: async () => json,
  } as unknown as LlmClient;
  return new AiService(llm);
}

const base = {
  taskType: 'translation',
  targetEnglish: 'He works in a company.',
  russian: 'Он работает в компании.',
  userAnswer: 'He work in a company.',
  level: 'A2',
};

describe('AiService.evaluateReviewAnswer (LLM)', () => {
  it('ошибка 3-го лица/формы глагола → verdict minor_error, accepted, errorType', async () => {
    const ai = aiWith({
      verdict: 'minor_error',
      accepted: true,
      corrected: 'He works in a company.',
      natural: 'He works at a company.',
      rule: 'В Present Simple после he/she/it к глаголу добавляется -s.',
      examples: ['She lives in Astana.', 'The company operates globally.'],
      errors: [
        {
          original: 'work',
          corrected: 'works',
          explanation: '3-е лицо ед. числа',
          errorType: 'VERB_FORM',
        },
      ],
    });
    const res = await ai.evaluateReviewAnswer(base);
    expect(res.aiMode).toBe('llm');
    expect(res.verdict).toBe('minor_error');
    expect(res.accepted).toBe(true);
    expect(res.errors[0].errorType).toBe('VERB_FORM');
    expect(res.rule).toContain('-s');
    expect(res.examples).toHaveLength(2);
  });

  it('ошибка артикля классифицируется как ARTICLE', async () => {
    const ai = aiWith({
      verdict: 'minor_error',
      accepted: true,
      corrected: 'I am a compliance officer.',
      natural: 'I am a compliance officer.',
      rule: 'Перед профессией в ед. числе нужен артикль a.',
      examples: ['She is a doctor.'],
      errors: [
        {
          original: 'am compliance',
          corrected: 'am a compliance',
          explanation: 'нужен артикль a',
          errorType: 'ARTICLE',
        },
      ],
    });
    const res = await ai.evaluateReviewAnswer({
      ...base,
      targetEnglish: 'I am a compliance officer.',
      userAnswer: 'I am compliance officer.',
    });
    expect(res.errors[0].errorType).toBe('ARTICLE');
    expect(res.accepted).toBe(true);
  });

  it('неправильный предлог → PREPOSITION, значимая ошибка не принимается', async () => {
    const ai = aiWith({
      verdict: 'significant_error',
      accepted: false,
      corrected: 'I am responsible for compliance.',
      natural: 'I am responsible for compliance.',
      rule: 'После responsible используется предлог for.',
      examples: ['She is responsible for reports.'],
      errors: [
        {
          original: 'responsible of',
          corrected: 'responsible for',
          explanation: 'предлог for',
          errorType: 'PREPOSITION',
        },
      ],
    });
    const res = await ai.evaluateReviewAnswer({
      ...base,
      userAnswer: 'I am responsible of compliance.',
    });
    expect(res.verdict).toBe('significant_error');
    expect(res.accepted).toBe(false);
    expect(res.errors[0].errorType).toBe('PREPOSITION');
  });

  it('неизвестный verdict от LLM → уход в fallback', async () => {
    const ai = aiWith({ verdict: 'perfecto', errors: [] });
    const res = await ai.evaluateReviewAnswer(base);
    expect(res.aiMode).toBe('fallback');
  });
});

describe('AiService.evaluateReviewAnswer (fallback без ИИ)', () => {
  it('частично правильный ответ → minor_error по совпадению токенов', async () => {
    const ai = aiWith({}, false);
    const res = await ai.evaluateReviewAnswer(base); // отличие в одном слове
    expect(res.aiMode).toBe('fallback');
    expect(['correct', 'minor_error']).toContain(res.verdict);
    expect(res.accepted).toBe(true);
  });

  it('полностью неверный ответ → wrong, не принимается', async () => {
    const ai = aiWith({}, false);
    const res = await ai.evaluateReviewAnswer({
      ...base,
      userAnswer: 'The weather is nice today.',
    });
    expect(res.verdict).toBe('wrong');
    expect(res.accepted).toBe(false);
  });
});
