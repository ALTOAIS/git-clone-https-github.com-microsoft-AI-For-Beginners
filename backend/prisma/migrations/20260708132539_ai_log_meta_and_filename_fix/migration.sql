-- AlterTable
ALTER TABLE "ai_interaction_logs" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SUCCESS';

-- Data fix: имена файлов, сохранённые как mojibake (UTF-8-байты, прочитанные как latin1).
-- Перекодируем только строки с характерными символами Ð/Ñ; каждую строку — с защитой от ошибок.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, "fileName" FROM "attachments" WHERE "fileName" ~ '[ÐÑ]' LOOP
    BEGIN
      UPDATE "attachments"
      SET "fileName" = convert_from(convert_to(r."fileName", 'LATIN1'), 'UTF8')
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- строка не является mojibake, оставляем как есть
    END;
  END LOOP;
  FOR r IN SELECT id, "fileName" FROM "analysis_documents" WHERE "fileName" ~ '[ÐÑ]' LOOP
    BEGIN
      UPDATE "analysis_documents"
      SET "fileName" = convert_from(convert_to(r."fileName", 'LATIN1'), 'UTF8')
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
