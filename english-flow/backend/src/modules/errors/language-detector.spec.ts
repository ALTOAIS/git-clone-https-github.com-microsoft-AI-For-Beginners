import { detectAnswerLanguage, extractEnglishPart } from './language-detector';

describe('detectAnswerLanguage', () => {
  it('EN — обычное английское предложение', () => {
    expect(detectAnswerLanguage('Yesterday I went home.')).toBe('EN');
  });

  it('RU — обычный русский ответ', () => {
    expect(detectAnswerLanguage('Вчера я пошёл домой')).toBe('RU');
  });

  it('MIXED — смешанный ответ', () => {
    expect(detectAnswerLanguage('Yesterday я ходил домой')).toBe('MIXED');
  });

  it('EMPTY — пустая строка', () => {
    expect(detectAnswerLanguage('   ')).toBe('EMPTY');
  });

  it('UNCLEAR — бессмысленный текст', () => {
    expect(detectAnswerLanguage('sdfsdf')).toBe('UNCLEAR');
  });

  it('UNCLEAR — только цифры/пунктуация', () => {
    expect(detectAnswerLanguage('123 !!!')).toBe('UNCLEAR');
  });

  it('EN — короткий, но осмысленный ответ', () => {
    expect(detectAnswerLanguage('I go')).toBe('EN');
  });
});

describe('extractEnglishPart', () => {
  it('извлекает английскую часть из смешанного ответа', () => {
    expect(extractEnglishPart('Yesterday я went домой')).toBe('Yesterday went');
  });

  it('возвращает null, если английской части почти нет', () => {
    expect(extractEnglishPart('вчера я пошёл I домой')).toBeNull();
  });
});
