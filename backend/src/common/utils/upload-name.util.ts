/**
 * Multer (busboy) интерпретирует имя файла из multipart-заголовка как latin1,
 * поэтому русские имена приходят в виде mojibake («Ð¿Ð°Ð¼ÑÑÐºÐ°.pdf»).
 * Перекодируем байты обратно в UTF-8, только если строка действительно
 * выглядит как перекодированный UTF-8 — иначе возвращаем как есть.
 */
export function decodeUploadedFileName(originalName: string): string {
  if (!/[À-ÿ]/.test(originalName)) return originalName;
  const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
  // Если после перекодировки появился знак замены — исходная строка
  // не была mojibake (например, настоящий latin1-текст) — не трогаем.
  if (decoded.includes('�')) return originalName;
  return decoded;
}
