import { generateMicroLessonFallback } from './fallbacks';

describe('generateMicroLessonFallback', () => {
  it('строит урок с упражнениями из реальных ошибок ученика', () => {
    const result = generateMicroLessonFallback('THIRD_PERSON_SINGULAR', [
      { original: 'He work here.', corrected: 'He works here.' },
      { original: 'She go there.', corrected: 'She goes there.' },
    ]);
    expect(result.aiMode).toBe('fallback');
    expect(result.content.ruleExplanation).toBeTruthy();
    expect(result.content.exercises.length).toBeGreaterThanOrEqual(4);
    const correctSentenceExercises = result.content.exercises.filter(
      (e) => e.type === 'correct_sentence',
    );
    expect(correctSentenceExercises[0].prompt).toBe('He work here.');
    expect(correctSentenceExercises[0].answer).toBe('He works here.');
  });

  it('работает даже без примеров ошибок пользователя (только общие упражнения)', () => {
    const result = generateMicroLessonFallback('ARTICLES', []);
    expect(result.content.exercises.length).toBeGreaterThanOrEqual(2);
    expect(result.content.exercises.every((e) => e.answer)).toBe(true);
  });

  it('покрывает все 12 категорий без ошибок', () => {
    const categories = [
      'ARTICLES',
      'THIRD_PERSON_SINGULAR',
      'PRESENT_SIMPLE',
      'PRESENT_PERFECT',
      'PAST_SIMPLE',
      'PREPOSITIONS',
      'WORD_ORDER',
      'COMPLY_VS_COMPLIANCE',
      'MAKE_VS_DO',
      'COUNTABLE_VS_UNCOUNTABLE',
      'COLLOCATIONS',
      'COMPLIANCE_VOCABULARY',
    ] as const;
    for (const category of categories) {
      const result = generateMicroLessonFallback(category, []);
      expect(result.content.ruleExplanation.length).toBeGreaterThan(10);
    }
  });
});
