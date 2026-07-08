import { AnalysisStage } from '@prisma/client';

/// Fixed 14-step order of a Внутренний анализ коррупционных рисков (ВАКР).
export const ANALYSIS_STAGE_ORDER: AnalysisStage[] = [
  AnalysisStage.CREATION,
  AnalysisStage.PLANNING,
  AnalysisStage.WORKING_GROUP,
  AnalysisStage.DOCUMENTS,
  AnalysisStage.PROCESS_MAP,
  AnalysisStage.FACTORS,
  AnalysisStage.RISKS,
  AnalysisStage.ASSESSMENT,
  AnalysisStage.RECOMMENDATIONS,
  AnalysisStage.ACTION_PLAN,
  AnalysisStage.COORDINATION,
  AnalysisStage.APPROVAL,
  AnalysisStage.MONITORING,
  AnalysisStage.REASSESSMENT,
];

/// All 14 stages now have a working UI.
export const IMPLEMENTED_STAGES: AnalysisStage[] = [
  AnalysisStage.CREATION,
  AnalysisStage.PLANNING,
  AnalysisStage.WORKING_GROUP,
  AnalysisStage.DOCUMENTS,
  AnalysisStage.PROCESS_MAP,
  AnalysisStage.FACTORS,
  AnalysisStage.RISKS,
  AnalysisStage.ASSESSMENT,
  AnalysisStage.RECOMMENDATIONS,
  AnalysisStage.ACTION_PLAN,
  AnalysisStage.COORDINATION,
  AnalysisStage.APPROVAL,
  AnalysisStage.MONITORING,
  AnalysisStage.REASSESSMENT,
];

export function isForwardStageTransition(
  current: AnalysisStage,
  target: AnalysisStage,
): boolean {
  const currentIndex = ANALYSIS_STAGE_ORDER.indexOf(current);
  const targetIndex = ANALYSIS_STAGE_ORDER.indexOf(target);
  // Free navigation back to any already-visited stage; forward moves only one step at a time.
  return targetIndex <= currentIndex + 1;
}

/// Russian labels for enum values printed into the AI-generated analytical report
/// and the Risk-origin snapshot — kept here (backend) since the report/origin
/// context is built server-side and can't reach the frontend's i18n catalog.
export const CORRUPTOGENIC_FACTOR_LABELS: Record<string, string> = {
  DISCRETION: 'Широкие дискреционные полномочия',
  CONFLICT_OF_INTEREST: 'Конфликт интересов',
  LACK_OF_CONTROL: 'Отсутствие контроля',
  OPACITY: 'Непрозрачность процедуры',
  EXCEPTIONS: 'Наличие исключений из общих правил',
  MANUAL_OPERATIONS: 'Ручные операции',
  INFORMATION_ACCESS: 'Доступ к закрытой информации',
  SUPPLIER_CONTACTS: 'Контакты с поставщиками',
  HR_DECISIONS: 'Кадровые решения',
  FINANCIAL_OPERATIONS: 'Финансовые операции',
  PROCUREMENT: 'Закупки',
  PERMITS: 'Выдача разрешений',
  PROPERTY_USE: 'Использование имущества',
  LEGAL_GAP: 'Правовой пробел',
  LEGAL_COLLISION: 'Коллизия правовых норм',
  LINGUISTIC_UNCERTAINTY: 'Юридико-лингвистическая неопределённость',
  RIGHT_INSTEAD_OF_DUTY: 'Право вместо обязанности',
  EXCESSIVE_REQUIREMENTS: 'Завышенные требования',
  ADMINISTRATIVE_BARRIERS: 'Излишние административные барьеры',
  IMPROPER_FUNCTIONS_DEFINITION:
    'Ненадлежащее определение функций, обязанностей, прав и ответственности',
  NO_DEADLINES: 'Отсутствие сроков',
  NO_DECISION_GROUNDS: 'Отсутствие оснований принятия решения',
  EXTERNAL_INTERACTION: 'Взаимодействие с внешними лицами',
};

export const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  ORGANIZATIONAL: 'Организационная',
  REGULATORY: 'Изменение нормативного документа',
  HR: 'Кадровая',
  DIGITALIZATION: 'Цифровизация',
  AUTOMATION: 'Автоматизация контроля',
  STRONGER_CONTROLS: 'Усиление контроля',
  SEPARATION_OF_DUTIES: 'Разделение полномочий',
  PROCESS_CHANGE: 'Изменение процесса',
  TRAINING: 'Обучение',
  MONITORING: 'Мониторинг',
};

export const ANALYSIS_SCOPE_LABELS: Record<string, string> = {
  LEGAL_ACTS: 'НПА и внутренние документы',
  ORG_MANAGEMENT: 'Организационно-управленческая деятельность',
  BOTH: 'НПА/внутренние документы и организационно-управленческая деятельность',
};

/// Шаг "Документы и объект анализа" — фиксированный чек-лист источников
/// информации (переиспользует общий механизм "ВАКР-навигатора": каждая строка —
/// это AnalysisChecklistAnswer с questionKey из этого списка).
export const SOURCE_CHECKLIST_CATALOG: { key: string; label: string }[] = [
  { key: 'SOURCE_LEGAL_ACTS', label: 'Правовые акты и внутренние документы' },
  { key: 'SOURCE_STATISTICS', label: 'Статистическая отчётность' },
  { key: 'SOURCE_IT_SYSTEMS', label: 'Данные информационных систем' },
  { key: 'SOURCE_INSPECTIONS', label: 'Результаты проверок' },
  { key: 'SOURCE_INTERNAL_AUDIT', label: 'Материалы внутреннего аудита' },
  { key: 'SOURCE_MONITORING', label: 'Антикоррупционный мониторинг' },
  { key: 'SOURCE_MEDIA', label: 'СМИ' },
  { key: 'SOURCE_APPEALS', label: 'Обращения физических и юридических лиц' },
  {
    key: 'SOURCE_DISCIPLINARY',
    label: 'Сведения о привлечении работников к ответственности',
  },
  { key: 'SOURCE_PREVIOUS_ANALYSIS', label: 'Предыдущие ВАКР' },
  { key: 'SOURCE_SURVEYS', label: 'Опросы и интервью работников' },
  { key: 'SOURCE_OTHER', label: 'Иные сведения' },
];
