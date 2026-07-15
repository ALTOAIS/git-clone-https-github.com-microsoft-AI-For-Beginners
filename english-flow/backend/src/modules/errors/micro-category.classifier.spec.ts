import { classifyMicroCategory } from './micro-category.classifier';

describe('classifyMicroCategory', () => {
  it('распознаёт третье лицо единственного числа', () => {
    expect(classifyMicroCategory('He work in the office.', 'He works in the office.')).toBe(
      'THIRD_PERSON_SINGULAR',
    );
  });

  it('распознаёт пропущенный/добавленный артикль', () => {
    expect(classifyMicroCategory('I am officer.', 'I am an officer.')).toBe('ARTICLES');
  });

  it('распознаёт неверный предлог', () => {
    expect(
      classifyMicroCategory('She is responsible of this project.', 'She is responsible for this project.'),
    ).toBe('PREPOSITIONS');
  });

  it('распознаёт Present Perfect вместо Past Simple', () => {
    expect(classifyMicroCategory('I finished the report.', 'I have finished the report.')).toBe(
      'PRESENT_PERFECT',
    );
  });

  it('распознаёт неверный порядок слов', () => {
    expect(classifyMicroCategory('Always I check the report.', 'I always check the report.')).toBe(
      'WORD_ORDER',
    );
  });

  it('распознаёт comply/compliance', () => {
    expect(
      classifyMicroCategory('The company must compliance with the law.', 'The company must comply with the law.'),
    ).toBe('COMPLY_VS_COMPLIANCE');
  });

  it('распознаёт make/do', () => {
    expect(classifyMicroCategory('We need to do a decision.', 'We need to make a decision.')).toBe(
      'MAKE_VS_DO',
    );
  });

  it('распознаёт исчисляемые/неисчисляемые существительные', () => {
    expect(
      classifyMicroCategory('We collected many evidences.', 'We collected much evidence.'),
    ).toBe('COUNTABLE_VS_UNCOUNTABLE');
  });

  it('распознаёт комплаенс-лексику', () => {
    expect(
      classifyMicroCategory('We found a breach of policy.', 'We found a violation of policy.'),
    ).toBe('COMPLIANCE_VOCABULARY');
  });

  it('возвращает null, если паттерн не распознан', () => {
    expect(classifyMicroCategory('xyz', 'xyz')).toBeNull();
  });
});
