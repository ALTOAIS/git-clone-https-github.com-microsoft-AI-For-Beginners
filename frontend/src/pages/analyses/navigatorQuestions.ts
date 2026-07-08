// ------------------------------------------------------------------
// ВАКР-навигатор: статические каталоги вопросов для каждого шага.
// Ответы хранятся в общей модели AnalysisChecklistAnswer (analysisId + questionKey).
// Для вопросов, относящихся к конкретному процессу или рекомендации, questionKey
// формируется как `${prefix}:${entityId}:${subKey}` через buildScopedQuestionKey.
// ------------------------------------------------------------------

export interface NavigatorQuestionDef {
  key: string;
  label: string;
}

export const CARD_NAVIGATOR_QUESTIONS: NavigatorQuestionDef[] = [
  { key: 'card_object_reason', label: 'Почему выбран именно этот объект анализа?' },
  { key: 'card_decision_details', label: 'Указаны ли номер и дата решения/приказа?' },
  { key: 'card_deadline_30_days', label: 'Укладывается ли срок проведения анализа в 30 рабочих дней?' },
  { key: 'card_extension_reason', label: 'Если требуется продление — по какой причине и на какой срок?' },
  { key: 'card_analysis_form', label: 'Определено ли, кто проводит анализ: уполномоченное лицо или рабочая группа?' },
];

export const PROCESS_SUBQUESTIONS: NavigatorQuestionDef[] = [
  { key: 'initiator', label: 'Кто инициирует процесс?' },
  { key: 'decision_maker', label: 'Кто принимает решение?' },
  { key: 'approver', label: 'Кто согласовывает?' },
  { key: 'signer', label: 'Кто утверждает?' },
  { key: 'controller', label: 'Кто контролирует?' },
  { key: 'documents_used', label: 'Какие документы используются?' },
  { key: 'it_systems_used', label: 'Какие информационные системы используются?' },
  { key: 'external_contacts', label: 'Есть ли контакт с поставщиками, заявителями, контрагентами или госорганами?' },
  { key: 'sensitive_decisions', label: 'Есть ли финансовые, кадровые или закупочные решения?' },
  { key: 'manual_decision', label: 'Где в процессе есть ручное решение?' },
  { key: 'influence_opportunity', label: 'Где есть возможность повлиять на результат?' },
  { key: 'no_control', label: 'Где отсутствует контроль?' },
];

export const RECOMMENDATION_SUBQUESTIONS: NavigatorQuestionDef[] = [
  { key: 'cause_addressed', label: 'Какую причину риска устраняет рекомендация?' },
  { key: 'eliminates_or_reduces', label: 'Устраняет рекомендация риск или снижает его?' },
  { key: 'expected_change', label: 'Что должно измениться после исполнения?' },
  { key: 'change_document', label: 'Нужно ли изменить внутренний документ?' },
  { key: 'change_process', label: 'Нужно ли изменить процесс?' },
  { key: 'automate_control', label: 'Нужно ли автоматизировать контроль?' },
  { key: 'separate_duties', label: 'Нужно ли разделить полномочия?' },
  { key: 'training_needed', label: 'Нужно ли провести обучение?' },
  { key: 'completion_form', label: 'Какая форма завершения подтвердит исполнение?' },
];

export function buildScopedQuestionKey(prefix: string, entityId: string, subKey: string): string {
  return `${prefix}:${entityId}:${subKey}`;
}

// Ключи должны совпадать с backend/src/modules/analyses/analyses.constants.ts (SOURCE_CHECKLIST_CATALOG)
export const SOURCE_CHECKLIST_CATALOG: NavigatorQuestionDef[] = [
  { key: 'SOURCE_LEGAL_ACTS', label: 'Правовые акты и внутренние документы' },
  { key: 'SOURCE_STATISTICS', label: 'Статистическая отчётность' },
  { key: 'SOURCE_IT_SYSTEMS', label: 'Данные информационных систем' },
  { key: 'SOURCE_INSPECTIONS', label: 'Результаты проверок' },
  { key: 'SOURCE_INTERNAL_AUDIT', label: 'Материалы внутреннего аудита' },
  { key: 'SOURCE_MONITORING', label: 'Антикоррупционный мониторинг' },
  { key: 'SOURCE_MEDIA', label: 'СМИ' },
  { key: 'SOURCE_APPEALS', label: 'Обращения физических и юридических лиц' },
  { key: 'SOURCE_DISCIPLINARY', label: 'Сведения о привлечении работников к ответственности' },
  { key: 'SOURCE_PREVIOUS_ANALYSIS', label: 'Предыдущие ВАКР' },
  { key: 'SOURCE_SURVEYS', label: 'Опросы и интервью работников' },
  { key: 'SOURCE_OTHER', label: 'Иные сведения' },
];
