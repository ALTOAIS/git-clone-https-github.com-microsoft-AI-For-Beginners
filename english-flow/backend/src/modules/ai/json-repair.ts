/**
 * Устойчивый разбор JSON-ответов LLM.
 *
 * Модели иногда возвращают технически «почти-JSON»: обёрнутый в markdown
 * code fences, с текстом вокруг, с висячими запятыми, с сырыми управляющими
 * символами внутри строк или обрезанный на лимите токенов. Этот модуль
 * реализует многоступенчатый разбор с ремонтом (см. parseModelJson).
 *
 * Модуль чистый (без зависимостей и логирования), чтобы легко тестироваться.
 */

/** Убирает markdown-ограждения ```json … ``` и обрезает пробелы. */
export function stripCodeFences(raw: string): string {
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

/**
 * Возвращает подстроку от первого «{» до последнего «}».
 * Если закрывающей скобки нет (ответ обрезан) — от первого «{» до конца,
 * чтобы ремонт мог достроить структуру.
 */
function extractJsonSlice(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start === -1) return undefined;
  const end = text.lastIndexOf('}');
  if (end <= start) return text.slice(start);
  return text.slice(start, end + 1);
}

/**
 * Ремонт «почти-JSON»:
 *  1) экранирует сырые управляющие символы внутри строк и закрывает
 *     незавершённую строку (частый случай при обрезке ответа);
 *  2) удаляет висячие запятые перед } или ];
 *  3) балансирует незакрытые { [ (достраивает закрывающие скобки при обрезке).
 */
export function repairJsonString(input: string): string {
  // --- Проход 1: экранирование управляющих символов в строках ---
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of input) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && ch.charCodeAt(0) <= 0x1f) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\t') out += '\\t';
      else if (ch === '\r') out += '\\r';
      else out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
      continue;
    }
    out += ch;
  }
  if (inString) out += '"';

  // --- Проход 2: удалить висячие запятые ---
  out = out.replace(/,(\s*[}\]])/g, '$1');

  // --- Проход 3: сбалансировать скобки ---
  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (const ch of out) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  while (stack.length) out += stack.pop();

  // Повторно убрать висячие запятые (закрытие могло создать «,}»)
  out = out.replace(/,(\s*[}\]])/g, '$1');
  return out;
}

/**
 * Многоступенчатый разбор ответа модели:
 *  1) JSON.parse как есть;
 *  2) снять markdown-ограждения + вырезать {…} и распарсить;
 *  3) отремонтировать и распарсить;
 *  4) вернуть undefined (вызывающий код уходит в fallback).
 */
export function parseModelJson(raw: string): unknown | undefined {
  // 1. Прямой разбор
  try {
    return JSON.parse(raw);
  } catch {
    /* переходим к очистке */
  }

  // 2. Снять fences и вырезать JSON-объект
  const stripped = stripCodeFences(raw);
  const slice = extractJsonSlice(stripped) ?? stripped;
  try {
    return JSON.parse(slice);
  } catch {
    /* переходим к ремонту */
  }

  // 3. Ремонт
  try {
    return JSON.parse(repairJsonString(slice));
  } catch {
    /* не удалось */
  }

  // 4. Fallback
  return undefined;
}
