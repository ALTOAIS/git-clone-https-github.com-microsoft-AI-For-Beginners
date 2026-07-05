import { ActionStatus, ControlEffectiveness, SourceType } from '@prisma/client';

export const ACTION_STATUS_LABELS_RU: Record<ActionStatus, string> = {
  [ActionStatus.PLANNED]: 'Запланировано',
  [ActionStatus.IN_PROGRESS]: 'В работе',
  [ActionStatus.COMPLETED]: 'Выполнено',
  [ActionStatus.OVERDUE]: 'Просрочено',
  [ActionStatus.CANCELLED]: 'Отменено',
};

export const CONTROL_EFFECTIVENESS_LABELS_RU: Record<
  ControlEffectiveness,
  string
> = {
  [ControlEffectiveness.EFFECTIVE]: 'Эффективен',
  [ControlEffectiveness.PARTIALLY_EFFECTIVE]: 'Частично эффективен',
  [ControlEffectiveness.INEFFECTIVE]: 'Неэффективен',
  [ControlEffectiveness.NOT_TESTED]: 'Не проверялся',
};

export const SOURCE_TYPE_LABELS_RU: Record<SourceType, string> = {
  [SourceType.CORRUPTION_RISK_ASSESSMENT]: 'Оценка коррупционных рисков',
  [SourceType.ANTI_CORRUPTION_MONITORING]: 'Антикоррупционный мониторинг',
  [SourceType.CANDIDATE_DUE_DILIGENCE]: 'Комплаенс-проверка кандидатов',
  [SourceType.COUNTERPARTY_DUE_DILIGENCE]: 'Комплаенс-проверка контрагентов',
  [SourceType.INVESTIGATION]: 'Служебная проверка',
  [SourceType.HOTLINE]: 'Горячая линия',
  [SourceType.CONFLICT_OF_INTEREST]: 'Конфликт интересов',
  [SourceType.GIFTS]: 'Подарки',
  [SourceType.AUDIT]: 'Аудит',
  [SourceType.STATE_INSPECTION]: 'Государственная проверка',
  [SourceType.MEDIA]: 'СМИ',
  [SourceType.HR]: 'Кадровая служба',
  [SourceType.PROCUREMENT]: 'Закупки',
  [SourceType.INVESTMENT]: 'Инвестиции',
  [SourceType.ESG]: 'ESG (устойчивое развитие)',
};
