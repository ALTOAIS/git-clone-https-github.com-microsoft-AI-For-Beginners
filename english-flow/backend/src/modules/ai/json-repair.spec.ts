import {
  parseModelJson,
  repairJsonString,
  stripCodeFences,
} from './json-repair';

describe('parseModelJson', () => {
  it('разбирает валидный JSON как есть', () => {
    expect(parseModelJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  it('снимает markdown-ограждения ```json … ```', () => {
    const raw = '```json\n{"verdict":"correct","errors":[]}\n```';
    expect(parseModelJson(raw)).toEqual({ verdict: 'correct', errors: [] });
  });

  it('снимает ограждения без языка ``` … ```', () => {
    expect(parseModelJson('```\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it('вырезает JSON из текста вокруг («Вот результат: {…}. Готово.»)', () => {
    const raw =
      'Конечно! Вот результат:\n{"title":"Урок","level":"A2"} Готово.';
    expect(parseModelJson(raw)).toEqual({ title: 'Урок', level: 'A2' });
  });

  it('чинит висячую запятую перед закрывающей скобкой', () => {
    expect(parseModelJson('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });

  it('чинит обрезанный ответ (незакрытые скобки — лимит токенов)', () => {
    // Обрыв на середине массива: достраиваем ] и }
    const raw =
      '{"summary":"текст","recurringErrors":[{"original":"I am officer"';
    const parsed = parseModelJson(raw) as {
      summary: string;
      recurringErrors: { original: string }[];
    };
    expect(parsed.summary).toBe('текст');
    expect(parsed.recurringErrors[0].original).toBe('I am officer');
  });

  it('чинит обрезанную строку (незакрытая кавычка)', () => {
    const parsed = parseModelJson('{"reply":"Hello, how are y') as {
      reply: string;
    };
    expect(parsed.reply).toBe('Hello, how are y');
  });

  it('экранирует сырой перевод строки внутри строкового значения', () => {
    const raw = '{"text":"line one\nline two"}';
    const parsed = parseModelJson(raw) as { text: string };
    expect(parsed.text).toBe('line one\nline two');
  });

  it('разбирает вложенные структуры диагностики', () => {
    const raw =
      '{"writingLevel":"A2","speakingLevel":"A1","strengths":["v"],' +
      '"recurringErrors":[{"original":"a","corrected":"b","errorType":"ARTICLE"}]}';
    const parsed = parseModelJson(raw) as { recurringErrors: unknown[] };
    expect(parsed.recurringErrors).toHaveLength(1);
  });

  it('возвращает undefined для ответа без JSON (уход в fallback)', () => {
    expect(parseModelJson('Извините, я не могу ответить.')).toBeUndefined();
  });

  it('возвращает undefined для пустой строки', () => {
    expect(parseModelJson('')).toBeUndefined();
  });
});

describe('stripCodeFences', () => {
  it('удаляет ограждения и обрезает пробелы', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe('repairJsonString', () => {
  it('балансирует незакрытые скобки', () => {
    expect(JSON.parse(repairJsonString('{"a":[1,2'))).toEqual({ a: [1, 2] });
  });

  it('идемпотентен для уже валидного JSON', () => {
    const valid = '{"a":1,"b":[1,2]}';
    expect(JSON.parse(repairJsonString(valid))).toEqual({ a: 1, b: [1, 2] });
  });
});
