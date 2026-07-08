import {
  ActionPriority,
  ActionStatus,
  AnalysisStage,
  AnalysisStatus,
  CampaignStatus,
  ControlEffectiveness,
  ControlType,
  CorruptogenicFactorType,
  CourseAssignmentStatus,
  CourseStatus,
  IncidentAction,
  IncidentStatus,
  LessonContentType,
  Prisma,
  PrismaClient,
  ProcessControlPointType,
  RecommendationType,
  Role,
  RiskStatus,
  SourceType,
  SurveyQuestionType,
  SurveyStatus,
  TestAttemptStage,
  TestQuestionType,
  TrainingPlanItemStatus,
  TrainingPlanStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { seedRiskTemplates } from './seed-risk-templates';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'ChangeMe123!';

const RISK_STATUS_LABELS_RU: Record<RiskStatus, string> = {
  [RiskStatus.DRAFT]: 'Черновик',
  [RiskStatus.NEW]: 'Новый',
  [RiskStatus.ASSESSMENT]: 'Оценка',
  [RiskStatus.APPROVED]: 'Утверждён',
  [RiskStatus.MONITORING]: 'Мониторинг',
  [RiskStatus.MITIGATION]: 'Устранение',
  [RiskStatus.RESIDUAL_ASSESSMENT]: 'Оценка остаточного риска',
  [RiskStatus.CLOSED]: 'Закрыт',
  [RiskStatus.ARCHIVED]: 'В архиве',
};

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function score(l?: number, i?: number) {
  return l && i ? l * i : undefined;
}

// Titles/names from the original English demo dataset (pre-localization). Any
// database seeded before the Russian rewrite has these rows sitting alongside
// the new Russian ones (they don't share a natural key), so every seed run
// deletes them to guarantee no English/Russian duplicates remain.
const LEGACY_ENGLISH_RISK_TITLES = [
  'Bribery risk in vendor selection process',
  'Excessive gifts and hospitality to public officials',
  'Inadequate due diligence on high-risk counterparties',
  'Undisclosed conflicts of interest in finance leadership',
  'Expense fraud via inflated reimbursement claims',
  'Data privacy breach in candidate screening data',
  'Supplier ESG non-compliance in manufacturing supply chain',
  'Regulatory non-compliance following state inspection findings',
  'Facilitation payments at customs clearance',
  'Vendor concentration risk in critical raw materials',
  'Historical bribery allegation now archived',
  'Media allegations of anti-competitive practices',
];
const LEGACY_ENGLISH_INCIDENT_TITLES = ['Hotline tip on vendor kickback'];
const LEGACY_ENGLISH_SOURCE_TITLES = [
  'Whistleblower report #2026-014',
  'Internal Audit Q1 2026',
  'Vendor DD - Acme Supplies',
  'Candidate DD - Senior Buyer role',
  'Press coverage - industry bribery scandal',
  'Regulator inspection notice',
  'Gift register entry - Q2 2026',
  'COI disclosure - Finance director',
  'Procurement anomaly flagged by ERP',
  'ESG supplier assessment',
  'Investigation case #INV-2026-002',
  'Annual corruption risk assessment 2026',
];
const LEGACY_ENGLISH_CATEGORY_NAMES = [
  'Corruption & Bribery',
  'Gifts & Hospitality',
  'Facilitation Payments',
  'Third-Party Risk',
  'Counterparty Due Diligence',
  'Vendor Risk',
  'Conflict of Interest',
  'Fraud',
  'Data Privacy & ESG',
  'ESG Compliance',
  'Data Protection',
  'Regulatory & Legal',
];
// Deleting these companies cascades to their departments and business processes.
const LEGACY_ENGLISH_COMPANY_NAMES = ['Northwind Holdings', 'Southbridge Industries'];

async function cleanupLegacyEnglishDemoData() {
  await prisma.risk.deleteMany({ where: { title: { in: LEGACY_ENGLISH_RISK_TITLES } } });
  await prisma.incident.deleteMany({ where: { title: { in: LEGACY_ENGLISH_INCIDENT_TITLES } } });
  await prisma.source.deleteMany({ where: { title: { in: LEGACY_ENGLISH_SOURCE_TITLES } } });
  await prisma.category.deleteMany({ where: { name: { in: LEGACY_ENGLISH_CATEGORY_NAMES } } });
  await prisma.company.deleteMany({ where: { name: { in: LEGACY_ENGLISH_COMPANY_NAMES } } });
}

async function main() {
  console.log('Заполнение ЕИСУКР демонстрационными данными...');

  await cleanupLegacyEnglishDemoData();

  // ---------------------------------------------------------------
  // Компании / Департаменты / Бизнес-процессы
  // ---------------------------------------------------------------
  const northwind = await prisma.company.upsert({
    where: { name: 'ТОО «Нордвинд Холдинг»' },
    update: {},
    create: { name: 'ТОО «Нордвинд Холдинг»', description: 'Головная холдинговая компания группы' },
  });
  const southbridge = await prisma.company.upsert({
    where: { name: 'АО «Саутбридж Индастриз»' },
    update: {},
    create: { name: 'АО «Саутбридж Индастриз»', description: 'Производственная дочерняя компания' },
  });

  const deptData: [string, string][] = [
    ['Департамент закупок', northwind.id],
    ['Департамент по управлению персоналом', northwind.id],
    ['Финансовый департамент', northwind.id],
    ['Департамент правового обеспечения и комплаенса', northwind.id],
    ['Департамент операционной деятельности', southbridge.id],
    ['Департамент продаж', southbridge.id],
  ];
  const departments: Record<string, string> = {};
  for (const [name, companyId] of deptData) {
    const dept = await prisma.department.upsert({
      where: { companyId_name: { companyId, name } },
      update: {},
      create: { name, companyId },
    });
    departments[name] = dept.id;
  }

  const processData: [string, string][] = [
    ['Онбординг поставщиков', 'Департамент закупок'],
    ['Управление тендерами', 'Департамент закупок'],
    ['Подбор персонала', 'Департамент по управлению персоналом'],
    ['Возмещение расходов', 'Финансовый департамент'],
    ['Юридическая экспертиза договоров', 'Департамент правового обеспечения и комплаенса'],
    ['Контроль качества производственной линии', 'Департамент операционной деятельности'],
  ];
  const processes: Record<string, string> = {};
  for (const [name, deptName] of processData) {
    const departmentId = departments[deptName];
    const process = await prisma.businessProcess.upsert({
      where: { departmentId_name: { departmentId, name } },
      update: {},
      create: { name, departmentId },
    });
    processes[name] = process.id;
  }

  // ---------------------------------------------------------------
  // Категории Библиотеки рисков (дерево)
  // ---------------------------------------------------------------
  async function upsertCategory(name: string, parentId?: string, description?: string) {
    const existing = await prisma.category.findFirst({ where: { name, parentId: parentId ?? null } });
    if (existing) return existing;
    return prisma.category.create({ data: { name, parentId, description } });
  }

  const corruption = await upsertCategory('Коррупция и взяточничество', undefined, 'Взяточничество, откаты и неправомерные платежи');
  const gifts = await upsertCategory('Подарки и представительские расходы', corruption.id);
  const facilitation = await upsertCategory('Платежи за содействие', corruption.id);

  const thirdParty = await upsertCategory('Риски третьих сторон', undefined, 'Риски, возникающие со стороны внешних контрагентов');
  const counterpartyDd = await upsertCategory('Комплаенс-проверка контрагентов', thirdParty.id);
  const vendorRisk = await upsertCategory('Риски поставщиков', thirdParty.id);

  const coi = await upsertCategory('Конфликт интересов');
  const fraud = await upsertCategory('Мошенничество');

  const esgCat = await upsertCategory('Защита данных и ESG');
  const esgSub = await upsertCategory('Соответствие принципам ESG', esgCat.id);
  const dataProtection = await upsertCategory('Защита персональных данных', esgCat.id);

  const regulatory = await upsertCategory('Регуляторные и правовые риски');

  // Дополнительные категории для направлений Библиотеки типовых рисков,
  // не покрытых деревом категорий выше (см. seed-risk-templates.ts).
  const procurementCat = await upsertCategory('Закупочная деятельность');
  const contractCat = await upsertCategory('Договорная работа');
  const hrCat = await upsertCategory('Кадровые риски');
  const financeCat = await upsertCategory('Финансовые риски');
  const accountingCat = await upsertCategory('Бухгалтерский учёт и отчётность');
  const charityCat = await upsertCategory('Благотворительность и спонсорство');
  const governmentCat = await upsertCategory('Взаимодействие с государственными органами');
  const affiliationCat = await upsertCategory('Аффилированность и связанные стороны');
  const assetCat = await upsertCategory('Управление имуществом');
  const constructionCat = await upsertCategory('Строительство и капитальные проекты');
  const insiderCat = await upsertCategory('Инсайдерская информация');
  const sanctionsCat = await upsertCategory('Санкционные риски');
  const amlCat = await upsertCategory('ПОД/ФТ (легализация доходов)');
  const corporateGovernanceCat = await upsertCategory('Корпоративное управление');
  const trainingCultureCat = await upsertCategory('Обучение и комплаенс-культура');

  await seedRiskTemplates(prisma, {
    'Закупочная деятельность': procurementCat.id,
    'Договорная работа': contractCat.id,
    'Конфликт интересов': coi.id,
    'Подарки и представительские расходы': gifts.id,
    'Кадровые риски': hrCat.id,
    'Финансовые риски': financeCat.id,
    'Бухгалтерский учёт и отчётность': accountingCat.id,
    'Благотворительность и спонсорство': charityCat.id,
    'Взаимодействие с государственными органами': governmentCat.id,
    'Комплаенс-проверка контрагентов': counterpartyDd.id,
    'Аффилированность и связанные стороны': affiliationCat.id,
    'Управление имуществом': assetCat.id,
    'Строительство и капитальные проекты': constructionCat.id,
    'Защита персональных данных': dataProtection.id,
    'Инсайдерская информация': insiderCat.id,
    'Санкционные риски': sanctionsCat.id,
    'ПОД/ФТ (легализация доходов)': amlCat.id,
    'Мошенничество': fraud.id,
    'Корпоративное управление': corporateGovernanceCat.id,
    'Обучение и комплаенс-культура': trainingCultureCat.id,
  });

  // ---------------------------------------------------------------
  // Пользователи
  // ---------------------------------------------------------------
  const passwordHash = await hash(DEMO_PASSWORD);
  const userSpecs: Array<{
    email: string;
    fullName: string;
    role: Role;
    title: string;
    companyId?: string;
    departmentId?: string;
  }> = [
    { email: 'admin@crh.local', fullName: 'Алексей Морозов', role: Role.ADMINISTRATOR, title: 'Системный администратор' },
    {
      email: 'officer@crh.local',
      fullName: 'Жанна Ахметова',
      role: Role.COMPLIANCE_OFFICER,
      title: 'Комплаенс-офицер',
      companyId: northwind.id,
      departmentId: departments['Департамент правового обеспечения и комплаенса'],
    },
    {
      email: 'manager@crh.local',
      fullName: 'Тимур Райымбеков',
      role: Role.COMPLIANCE_MANAGER,
      title: 'Руководитель службы комплаенса',
      companyId: northwind.id,
      departmentId: departments['Департамент правового обеспечения и комплаенса'],
    },
    {
      email: 'owner@crh.local',
      fullName: 'Марат Бекенов',
      role: Role.RISK_OWNER,
      title: 'Руководитель отдела закупок',
      companyId: northwind.id,
      departmentId: departments['Департамент закупок'],
    },
    {
      email: 'deptmgr@crh.local',
      fullName: 'Каусар Нурланова',
      role: Role.DEPARTMENT_MANAGER,
      title: 'Руководитель производственного департамента',
      companyId: southbridge.id,
      departmentId: departments['Департамент операционной деятельности'],
    },
    {
      email: 'audit@crh.local',
      fullName: 'Дмитрий Ким',
      role: Role.INTERNAL_AUDIT,
      title: 'Внутренний аудитор',
      companyId: northwind.id,
    },
    { email: 'board@crh.local', fullName: 'Асель Жунусова', role: Role.BOARD, title: 'Член Совета директоров' },
  ];

  const users: Record<string, string> = {};
  for (const spec of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        fullName: spec.fullName,
        role: spec.role,
        title: spec.title,
        companyId: spec.companyId ?? null,
        departmentId: spec.departmentId ?? null,
      },
      create: { ...spec, passwordHash },
    });
    users[spec.email] = user.id;
  }

  // ---------------------------------------------------------------
  // Источники
  // ---------------------------------------------------------------
  const sourceSpecs: Array<{ type: SourceType; title: string; description?: string }> = [
    { type: SourceType.HOTLINE, title: 'Обращение на линию доверия №2026-014', description: 'Анонимное сообщение по горячей линии' },
    { type: SourceType.AUDIT, title: 'Внутренний аудит, I квартал 2026', description: 'Результаты квартального внутреннего аудита' },
    { type: SourceType.COUNTERPARTY_DUE_DILIGENCE, title: 'Комплаенс-проверка контрагента — ТОО «АкмеСнаб»' },
    { type: SourceType.CANDIDATE_DUE_DILIGENCE, title: 'Проверка кандидата на должность ведущего специалиста по закупкам' },
    { type: SourceType.MEDIA, title: 'Публикация в СМИ о коррупционном скандале в отрасли' },
    { type: SourceType.STATE_INSPECTION, title: 'Уведомление о проверке уполномоченного государственного органа' },
    { type: SourceType.GIFTS, title: 'Запись в реестре подарков — II квартал 2026' },
    { type: SourceType.CONFLICT_OF_INTEREST, title: 'Декларация о конфликте интересов — финансовый директор' },
    { type: SourceType.PROCUREMENT, title: 'Аномалия в закупках, выявленная ERP-системой' },
    { type: SourceType.ESG, title: 'Оценка поставщика по критериям ESG' },
    { type: SourceType.INVESTIGATION, title: 'Служебная проверка №INV-2026-002' },
    { type: SourceType.CORRUPTION_RISK_ASSESSMENT, title: 'Ежегодная оценка коррупционных рисков за 2026 год' },
  ];
  const sources: Record<string, string> = {};
  for (const spec of sourceSpecs) {
    const existing = await prisma.source.findFirst({ where: { title: spec.title } });
    const source =
      existing ??
      (await prisma.source.create({ data: { ...spec, createdById: users['officer@crh.local'] } }));
    sources[spec.title] = source.id;
  }

  // ---------------------------------------------------------------
  // Риски + контрольные мероприятия + план действий + инциденты + комментарии
  // ---------------------------------------------------------------
  const riskSpecs: Array<{
    title: string;
    description: string;
    categoryId: string;
    companyId: string;
    departmentId: string;
    businessProcessId?: string;
    ownerId: string;
    status: RiskStatus;
    likelihood?: number;
    impact?: number;
    residualLikelihood?: number;
    residualImpact?: number;
    sourceTitles?: string[];
    controls?: Array<{ type: ControlType; title: string; effectiveness: ControlEffectiveness }>;
    actions?: Array<{ title: string; status: ActionStatus; deadlineOffsetDays: number; ownerEmail: string }>;
  }> = [
    {
      title: 'Риск взяточничества при выборе поставщиков',
      description: 'Риск неправомерного влияния на выбор поставщика в ходе тендерных процедур посредством неправомерных платежей.',
      categoryId: corruption.id,
      companyId: northwind.id,
      departmentId: departments['Департамент закупок'],
      businessProcessId: processes['Управление тендерами'],
      ownerId: users['owner@crh.local'],
      status: RiskStatus.MONITORING,
      likelihood: 4,
      impact: 5,
      residualLikelihood: 2,
      residualImpact: 4,
      sourceTitles: ['Внутренний аудит, I квартал 2026', 'Аномалия в закупках, выявленная ERP-системой'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Двойное согласование тендеров сверх установленного порога', effectiveness: ControlEffectiveness.EFFECTIVE },
        { type: ControlType.DETECTIVE, title: 'Автоматизированное выявление аномалий в ERP-системе', effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE },
      ],
      actions: [
        { title: 'Внедрение усовершенствованной модели оценки поставщиков', status: ActionStatus.IN_PROGRESS, deadlineOffsetDays: 20, ownerEmail: 'owner@crh.local' },
        { title: 'Повторное обучение сотрудников отдела закупок политике противодействия взяточничеству', status: ActionStatus.OVERDUE, deadlineOffsetDays: -5, ownerEmail: 'owner@crh.local' },
      ],
    },
    {
      title: 'Чрезмерные подарки и представительские расходы для государственных должностных лиц',
      description: 'Риск предоставления подарков государственным партнёрам сверх установленных политикой лимитов.',
      categoryId: gifts.id,
      companyId: northwind.id,
      departmentId: departments['Департамент правового обеспечения и комплаенса'],
      ownerId: users['officer@crh.local'],
      status: RiskStatus.APPROVED,
      likelihood: 3,
      impact: 4,
      sourceTitles: ['Запись в реестре подарков — II квартал 2026'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Процедура предварительного согласования подарков', effectiveness: ControlEffectiveness.EFFECTIVE },
      ],
      actions: [
        { title: 'Публикация обновлённой политики по подаркам и представительским расходам', status: ActionStatus.PLANNED, deadlineOffsetDays: 30, ownerEmail: 'officer@crh.local' },
      ],
    },
    {
      title: 'Недостаточная комплаенс-проверка контрагентов повышенного риска',
      description: 'Процедура онбординга контрагентов может не обеспечивать достаточную проверку на предмет санкционных списков и статуса публичных должностных лиц (PEP).',
      categoryId: counterpartyDd.id,
      companyId: northwind.id,
      departmentId: departments['Департамент закупок'],
      businessProcessId: processes['Онбординг поставщиков'],
      ownerId: users['owner@crh.local'],
      status: RiskStatus.MITIGATION,
      likelihood: 4,
      impact: 4,
      residualLikelihood: 2,
      residualImpact: 3,
      sourceTitles: ['Комплаенс-проверка контрагента — ТОО «АкмеСнаб»'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Проверка по санкционным спискам и PEP при онбординге', effectiveness: ControlEffectiveness.EFFECTIVE },
        { type: ControlType.CORRECTIVE, title: 'Прекращение сотрудничества с выявленными контрагентами', effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE },
      ],
      actions: [
        { title: 'Внедрение непрерывного мониторинга санкционных списков', status: ActionStatus.IN_PROGRESS, deadlineOffsetDays: 15, ownerEmail: 'owner@crh.local' },
      ],
    },
    {
      title: 'Нераскрытый конфликт интересов в руководстве финансового блока',
      description: 'Риск влияния нераскрытых финансовых интересов на принятие решений в финансовом департаменте.',
      categoryId: coi.id,
      companyId: northwind.id,
      departmentId: departments['Финансовый департамент'],
      ownerId: users['manager@crh.local'],
      status: RiskStatus.RESIDUAL_ASSESSMENT,
      likelihood: 3,
      impact: 4,
      residualLikelihood: 1,
      residualImpact: 3,
      sourceTitles: ['Декларация о конфликте интересов — финансовый директор'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Ежегодное декларирование конфликта интересов', effectiveness: ControlEffectiveness.EFFECTIVE },
      ],
      actions: [
        { title: 'Рассмотрение декларации финансового директора', status: ActionStatus.COMPLETED, deadlineOffsetDays: -10, ownerEmail: 'manager@crh.local' },
      ],
    },
    {
      title: 'Мошенничество при возмещении расходов путём завышения сумм',
      description: 'Работники подают завышенные или фиктивные заявки на возмещение расходов.',
      categoryId: fraud.id,
      companyId: northwind.id,
      departmentId: departments['Финансовый департамент'],
      businessProcessId: processes['Возмещение расходов'],
      ownerId: users['manager@crh.local'],
      status: RiskStatus.CLOSED,
      likelihood: 2,
      impact: 3,
      residualLikelihood: 1,
      residualImpact: 2,
      controls: [
        { type: ControlType.DETECTIVE, title: 'Автоматическое выявление аномалий в расходах', effectiveness: ControlEffectiveness.EFFECTIVE },
      ],
      actions: [
        { title: 'Завершение финансового расследования', status: ActionStatus.COMPLETED, deadlineOffsetDays: -30, ownerEmail: 'manager@crh.local' },
      ],
    },
    {
      title: 'Нарушение конфиденциальности персональных данных кандидатов',
      description: 'Департамент по управлению персоналом может хранить персональные данные кандидатов дольше установленного срока.',
      categoryId: dataProtection.id,
      companyId: northwind.id,
      departmentId: departments['Департамент по управлению персоналом'],
      businessProcessId: processes['Подбор персонала'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.ASSESSMENT,
      likelihood: 3,
      impact: 3,
      sourceTitles: ['Проверка кандидата на должность ведущего специалиста по закупкам'],
      actions: [
        { title: 'Установление графика хранения персональных данных кандидатов', status: ActionStatus.PLANNED, deadlineOffsetDays: 45, ownerEmail: 'deptmgr@crh.local' },
      ],
    },
    {
      title: 'Несоответствие поставщиков требованиям ESG в производственной цепочке поставок',
      description: 'Ключевые поставщики могут не соответствовать экологическим и трудовым стандартам.',
      categoryId: esgSub.id,
      companyId: southbridge.id,
      departmentId: departments['Департамент операционной деятельности'],
      businessProcessId: processes['Контроль качества производственной линии'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.NEW,
      sourceTitles: ['Оценка поставщика по критериям ESG'],
    },
    {
      title: 'Несоответствие регуляторным требованиям по результатам государственной проверки',
      description: 'Результаты недавней государственной проверки указывают на пробелы в системе контролей.',
      categoryId: regulatory.id,
      companyId: southbridge.id,
      departmentId: departments['Департамент операционной деятельности'],
      ownerId: users['officer@crh.local'],
      status: RiskStatus.DRAFT,
      sourceTitles: ['Уведомление о проверке уполномоченного государственного органа'],
    },
    {
      title: 'Платежи за содействие при таможенном оформлении',
      description: 'Сотрудники логистики на местах могут производить небольшие платежи за содействие для ускорения таможенного оформления.',
      categoryId: facilitation.id,
      companyId: southbridge.id,
      departmentId: departments['Департамент операционной деятельности'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.MONITORING,
      likelihood: 3,
      impact: 3,
      residualLikelihood: 2,
      residualImpact: 2,
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Договоры с предварительно аккредитованными таможенными брокерами', effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE },
      ],
      actions: [
        { title: 'Аудит платежей таможенным брокерам', status: ActionStatus.IN_PROGRESS, deadlineOffsetDays: 10, ownerEmail: 'deptmgr@crh.local' },
      ],
    },
    {
      title: 'Риск концентрации поставщиков критически важного сырья',
      description: 'Чрезмерная зависимость от небольшого числа поставщиков критически важного сырья.',
      categoryId: vendorRisk.id,
      companyId: southbridge.id,
      departmentId: departments['Департамент операционной деятельности'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.APPROVED,
      likelihood: 3,
      impact: 5,
      sourceTitles: ['Комплаенс-проверка контрагента — ТОО «АкмеСнаб»'],
      actions: [
        { title: 'Квалификация двух дополнительных альтернативных поставщиков', status: ActionStatus.PLANNED, deadlineOffsetDays: 60, ownerEmail: 'deptmgr@crh.local' },
      ],
    },
    {
      title: 'Архивное обвинение во взяточничестве (историческое)',
      description: 'Ранее рассмотренное обвинение расследовано и закрыто без выявленных нарушений; сохранено для справки.',
      categoryId: corruption.id,
      companyId: northwind.id,
      departmentId: departments['Департамент правового обеспечения и комплаенса'],
      ownerId: users['officer@crh.local'],
      status: RiskStatus.ARCHIVED,
      likelihood: 2,
      impact: 3,
      residualLikelihood: 1,
      residualImpact: 1,
      sourceTitles: ['Служебная проверка №INV-2026-002'],
    },
    {
      title: 'Обвинения в СМИ в антиконкурентных практиках',
      description: 'Публикации в прессе содержат обвинения в антиконкурентном сговоре на региональном рынке.',
      categoryId: regulatory.id,
      companyId: northwind.id,
      departmentId: departments['Департамент правового обеспечения и комплаенса'],
      ownerId: users['manager@crh.local'],
      status: RiskStatus.ASSESSMENT,
      likelihood: 2,
      impact: 5,
      sourceTitles: ['Публикация в СМИ о коррупционном скандале в отрасли'],
    },
  ];

  let created = 0;
  for (const spec of riskSpecs) {
    const existing = await prisma.risk.findFirst({ where: { title: spec.title } });
    if (existing) continue;

    const year = new Date().getFullYear();
    const count = await prisma.risk.count({ where: { code: { startsWith: `RISK-${year}-` } } });
    const code = `RISK-${year}-${String(count + 1).padStart(4, '0')}`;

    const inherentScore = score(spec.likelihood, spec.impact);
    const residualScore = score(spec.residualLikelihood, spec.residualImpact);

    const risk = await prisma.risk.create({
      data: {
        code,
        title: spec.title,
        description: spec.description,
        categoryId: spec.categoryId,
        companyId: spec.companyId,
        departmentId: spec.departmentId,
        businessProcessId: spec.businessProcessId,
        ownerId: spec.ownerId,
        createdById: users['officer@crh.local'],
        status: spec.status,
        likelihood: spec.likelihood,
        impact: spec.impact,
        inherentScore,
        residualLikelihood: spec.residualLikelihood,
        residualImpact: spec.residualImpact,
        residualScore,
        approvedAt: ([RiskStatus.APPROVED, RiskStatus.MONITORING, RiskStatus.MITIGATION, RiskStatus.RESIDUAL_ASSESSMENT, RiskStatus.CLOSED, RiskStatus.ARCHIVED] as RiskStatus[]).includes(spec.status) ? new Date() : undefined,
        closedAt: ([RiskStatus.CLOSED, RiskStatus.ARCHIVED] as RiskStatus[]).includes(spec.status) ? new Date() : undefined,
        archivedAt: spec.status === RiskStatus.ARCHIVED ? new Date() : undefined,
        sources: spec.sourceTitles
          ? { create: spec.sourceTitles.map((title) => ({ sourceId: sources[title] })) }
          : undefined,
      },
    });

    if (spec.controls) {
      for (const control of spec.controls) {
        await prisma.control.create({
          data: {
            riskId: risk.id,
            type: control.type,
            title: control.title,
            effectiveness: control.effectiveness,
            ownerId: spec.ownerId,
            lastTestedAt: new Date(),
          },
        });
      }
      const weight: Record<string, number> = { EFFECTIVE: 100, PARTIALLY_EFFECTIVE: 60, INEFFECTIVE: 20, NOT_TESTED: 0 };
      const avg = spec.controls.reduce((sum, c) => sum + weight[c.effectiveness], 0) / spec.controls.length;
      await prisma.risk.update({ where: { id: risk.id }, data: { controlEffectivenessAvg: Math.round(avg * 100) / 100 } });
    }

    if (spec.actions) {
      for (const action of spec.actions) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + action.deadlineOffsetDays);
        await prisma.action.create({
          data: {
            riskId: risk.id,
            title: action.title,
            status: action.status,
            deadline,
            ownerId: users[action.ownerEmail],
            completedAt: action.status === ActionStatus.COMPLETED ? new Date() : undefined,
            result: action.status === ActionStatus.COMPLETED ? 'Выполнено согласно плану.' : undefined,
          },
        });
      }
    }

    await prisma.comment.create({
      data: {
        riskId: risk.id,
        authorId: users['officer@crh.local'],
        text: `Риск зарегистрирован и направлен на этап «${RISK_STATUS_LABELS_RU[spec.status]}».`,
      },
    });

    await prisma.riskHistory.create({
      data: {
        riskId: risk.id,
        version: 1,
        snapshot: JSON.parse(JSON.stringify(risk)),
        changedById: users['officer@crh.local'],
        changeNote: 'Первоначальное создание из демонстрационных данных',
      },
    });

    created += 1;
  }

  // Инцидент, связанный с риском, демонстрирующий сценарий «инцидент → риск»
  const briberyRisk = await prisma.risk.findFirst({ where: { title: 'Риск взяточничества при выборе поставщиков' } });
  if (briberyRisk) {
    const existingIncident = await prisma.incident.findFirst({ where: { title: 'Обращение на горячую линию об откате при выборе поставщика' } });
    if (!existingIncident) {
      await prisma.incident.create({
        data: {
          title: 'Обращение на горячую линию об откате при выборе поставщика',
          description: 'Анонимное обращение с утверждением о выплате откатов при выборе поставщика.',
          status: IncidentStatus.UNDER_REVIEW,
          action: IncidentAction.UPDATE_RISK,
          sourceId: sources['Обращение на линию доверия №2026-014'],
          riskId: briberyRisk.id,
          reportedById: users['audit@crh.local'],
        },
      });
    }
  }

  // ---------------------------------------------------------------
  // Внутренний анализ коррупционных рисков (ВАКР) — демонстрационные анализы
  // ---------------------------------------------------------------
  const existingAnalysis1 = await prisma.corruptionAnalysis.findFirst({
    where: { name: 'ВАКР процесса закупок ТОО «Нордвинд Холдинг» за 2026 год' },
  });
  if (!existingAnalysis1) {
    const analysis1 = await prisma.corruptionAnalysis.create({
      data: {
        code: 'ВАКР-2026-0001',
        name: 'ВАКР процесса закупок ТОО «Нордвинд Холдинг» за 2026 год',
        companyId: northwind.id,
        subject: 'Процесс проведения закупок товаров, работ и услуг',
        legalBasis: 'Закон Республики Казахстан «О противодействии коррупции», приказ о проведении внутреннего анализа коррупционных рисков №14 от 12.01.2026',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-06-30'),
        deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
        leadId: users['manager@crh.local'],
        stage: AnalysisStage.COORDINATION,
        status: AnalysisStatus.IN_PROGRESS,
        createdById: users['officer@crh.local'],
        departments: {
          create: [{ departmentId: departments['Департамент закупок'] }],
        },
        workingGroup: {
          create: [
            {
              userId: users['manager@crh.local'],
              role: 'Руководитель рабочей группы',
              functions: 'Общее руководство анализом, утверждение результатов',
              responsibilityArea: 'Весь процесс закупок',
              completed: false,
            },
            {
              userId: users['officer@crh.local'],
              role: 'Ответственный исполнитель',
              functions: 'Сбор документов, выявление рисков, подготовка отчёта',
              responsibilityArea: 'Процесс закупок Департамента закупок',
              completed: false,
            },
            {
              userId: users['owner@crh.local'],
              role: 'Эксперт от подразделения',
              functions: 'Консультации по особенностям процесса закупок',
              responsibilityArea: 'Департамент закупок',
              completed: true,
            },
          ],
        },
        planItems: {
          create: [
            {
              process: 'Отбор поставщиков',
              direction: 'Закупочная деятельность',
              departmentId: departments['Департамент закупок'],
              ownerId: users['officer@crh.local'],
              deadline: new Date(new Date().setDate(new Date().getDate() + 10)),
              checkpoint: 'Промежуточная сверка выявленных рисков',
            },
            {
              process: 'Согласование и подписание договоров',
              direction: 'Закупочная деятельность',
              departmentId: departments['Департамент закупок'],
              ownerId: users['officer@crh.local'],
              deadline: new Date(new Date().setDate(new Date().getDate() + 20)),
              checkpoint: 'Проверка карты бизнес-процесса',
            },
          ],
        },
      },
    });

    // Stage 5: Карта бизнес-процессов
    const step1 = await prisma.analysisProcessStep.create({
      data: {
        analysisId: analysis1.id,
        order: 1,
        name: 'Инициирование закупки',
        description: 'Подразделение подаёт заявку на закупку товаров, работ или услуг.',
        departmentId: departments['Департамент закупок'],
        executorId: users['officer@crh.local'],
        legalBasis: 'Закон РК «О государственных закупках», внутренний регламент закупочной деятельности',
        inputDescription: 'Заявка подразделения на закупку',
        outputDescription: 'Утверждённая заявка на закупку',
        controlPoints: [ProcessControlPointType.DECISION_MAKING],
      },
    });
    const step2 = await prisma.analysisProcessStep.create({
      data: {
        analysisId: analysis1.id,
        order: 2,
        name: 'Выбор способа закупки и определение поставщика',
        description: 'Комиссия выбирает способ закупки (конкурс, запрос ценовых предложений, из одного источника) и определяет поставщика.',
        departmentId: departments['Департамент закупок'],
        executorId: users['officer@crh.local'],
        legalBasis: 'Правила осуществления закупок, утверждённые внутренним положением о закупках',
        inputDescription: 'Утверждённая заявка на закупку',
        outputDescription: 'Протокол выбора способа закупки и поставщика',
        controlPoints: [
          ProcessControlPointType.DISCRETIONARY_POWERS,
          ProcessControlPointType.EXTERNAL_CONTACTS,
          ProcessControlPointType.PROCUREMENT,
        ],
      },
    });
    const step3 = await prisma.analysisProcessStep.create({
      data: {
        analysisId: analysis1.id,
        order: 3,
        name: 'Согласование и подписание договора',
        description: 'Договор с выбранным поставщиком проходит внутреннее согласование и подписывается уполномоченным лицом.',
        departmentId: departments['Департамент закупок'],
        executorId: users['manager@crh.local'],
        legalBasis: 'Положение о договорной работе',
        inputDescription: 'Протокол выбора поставщика, проект договора',
        outputDescription: 'Подписанный договор',
        controlPoints: [
          ProcessControlPointType.DECISION_MAKING,
          ProcessControlPointType.FINANCIAL_OPERATIONS,
        ],
      },
    });
    await prisma.analysisProcessStep.create({
      data: {
        analysisId: analysis1.id,
        order: 4,
        name: 'Исполнение договора и приёмка',
        description: 'Приёмка поставленных товаров, работ или услуг и оплата по договору.',
        departmentId: departments['Департамент закупок'],
        executorId: users['officer@crh.local'],
        legalBasis: 'Положение о приёмке товаров, работ и услуг',
        inputDescription: 'Подписанный договор',
        outputDescription: 'Акт приёмки, оплата по договору',
        controlPoints: [ProcessControlPointType.CONTROL_MEASURES],
      },
    });

    // Stage 6: Выявление коррупциогенных факторов
    const factor1 = await prisma.analysisFactor.create({
      data: {
        analysisId: analysis1.id,
        processStepId: step2.id,
        factorType: CorruptogenicFactorType.DISCRETION,
        description: 'Широкие дискреционные полномочия при выборе способа закупки без чётко закреплённых критериев принятия решения.',
      },
    });
    const factor2 = await prisma.analysisFactor.create({
      data: {
        analysisId: analysis1.id,
        processStepId: step2.id,
        factorType: CorruptogenicFactorType.SUPPLIER_CONTACTS,
        description: 'Прямые контакты сотрудников с потенциальными поставщиками до объявления закупки.',
      },
    });
    const factor3 = await prisma.analysisFactor.create({
      data: {
        analysisId: analysis1.id,
        processStepId: step3.id,
        factorType: CorruptogenicFactorType.CONFLICT_OF_INTEREST,
        description: 'Отсутствие обязательной проверки на конфликт интересов при согласовании договора с поставщиком.',
      },
    });

    // Stage 7-8: Выявление и оценка коррупционных рисков
    const risk1 = await prisma.analysisRisk.create({
      data: {
        analysisId: analysis1.id,
        factorId: factor1.id,
        title: 'Риск необоснованного выбора неконкурентного способа закупки',
        description: 'Выбор закупки из одного источника без достаточных оснований в целях создания преимущества конкретному поставщику.',
        categoryId: vendorRisk.id,
        source: 'Внутренний анализ бизнес-процесса закупок',
        cause: 'Отсутствие чётких критериев выбора способа закупки во внутреннем положении',
        conditions: 'Единоличное принятие решения без коллегиального рассмотрения',
        corruptionScheme: 'Сотрудник закупочного подразделения обосновывает закупку из одного источника в интересах аффилированного поставщика, получая от него вознаграждение.',
        interestedParties: 'Сотрудник Департамента закупок, аффилированный поставщик',
        consequences: 'Завышение цены закупки, снижение качества товаров/услуг, репутационный ущерб',
        existingControls: 'Визирование заявки руководителем подразделения',
        ownerId: users['manager@crh.local'],
        likelihood: 4,
        impact: 4,
        score: 16,
        controlEffectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE,
        residualLikelihood: 3,
        residualImpact: 3,
        residualScore: 9,
      },
    });
    const risk2 = await prisma.analysisRisk.create({
      data: {
        analysisId: analysis1.id,
        factorId: factor2.id,
        title: 'Риск сговора с поставщиком до объявления закупки',
        description: 'Заблаговременная передача сведений об условиях будущей закупки конкретному поставщику для обеспечения его победы.',
        categoryId: corruption.id,
        source: 'Внутренний анализ бизнес-процесса закупок',
        cause: 'Отсутствие ограничений на предварительное общение с потенциальными поставщиками',
        conditions: 'Неформальные контакты вне регламентированных каналов взаимодействия',
        corruptionScheme: 'Сотрудник передаёт поставщику проект технического задания заранее, поставщик готовит наиболее выгодное для себя предложение и получает контракт.',
        interestedParties: 'Сотрудник Департамента закупок, потенциальный поставщик',
        consequences: 'Ограничение конкуренции, завышение стоимости закупки',
        existingControls: 'Не определены',
        ownerId: users['officer@crh.local'],
        likelihood: 3,
        impact: 4,
        score: 12,
        controlEffectiveness: ControlEffectiveness.NOT_TESTED,
        residualLikelihood: 3,
        residualImpact: 4,
        residualScore: 12,
      },
    });
    const risk3 = await prisma.analysisRisk.create({
      data: {
        analysisId: analysis1.id,
        factorId: factor3.id,
        title: 'Риск подписания договора при наличии конфликта интересов',
        description: 'Подписание договора с поставщиком, аффилированным с лицом, принимающим решение, без раскрытия конфликта интересов.',
        categoryId: coi.id,
        source: 'Внутренний анализ бизнес-процесса закупок',
        cause: 'Отсутствие обязательной декларации конфликта интересов перед согласованием договора',
        conditions: 'Согласование договора без проверки аффилированности сторон',
        corruptionScheme: 'Руководитель согласовывает договор с организацией, учредителем которой является его родственник, не раскрывая эту связь.',
        interestedParties: 'Руководитель, подписывающий договор, аффилированная организация',
        consequences: 'Заключение невыгодных для компании условий договора, репутационный ущерб',
        existingControls: 'Декларация конфликта интересов при приёме на работу (не актуализируется)',
        ownerId: users['manager@crh.local'],
        likelihood: 2,
        impact: 5,
        score: 10,
        controlEffectiveness: ControlEffectiveness.INEFFECTIVE,
        residualLikelihood: 2,
        residualImpact: 4,
        residualScore: 8,
      },
    });

    // Stage 9: Формирование рекомендаций
    const rec1 = await prisma.analysisRecommendation.create({
      data: {
        analysisId: analysis1.id,
        riskId: risk1.id,
        type: RecommendationType.STRONGER_CONTROLS,
        description: 'Ввести обязательное коллегиальное рассмотрение решений о выборе способа закупки свыше установленного порога.',
        responsibleId: users['manager@crh.local'],
      },
    });
    const rec2 = await prisma.analysisRecommendation.create({
      data: {
        analysisId: analysis1.id,
        riskId: risk2.id,
        type: RecommendationType.REGULATORY,
        description: 'Утвердить регламент, запрещающий предварительные контакты сотрудников с потенциальными поставщиками до объявления закупки.',
        responsibleId: users['officer@crh.local'],
      },
    });
    const rec3 = await prisma.analysisRecommendation.create({
      data: {
        analysisId: analysis1.id,
        riskId: risk3.id,
        type: RecommendationType.ORGANIZATIONAL,
        description: 'Внедрить обязательную процедуру декларирования конфликта интересов перед согласованием каждого договора.',
        responsibleId: users['manager@crh.local'],
      },
    });

    // Stage 10: План мероприятий
    await prisma.analysisActionItem.create({
      data: {
        analysisId: analysis1.id,
        recommendationId: rec1.id,
        task: 'Разработать и утвердить регламент коллегиального рассмотрения закупок',
        expectedResult: 'Утверждённый регламент, снижение риска необоснованного выбора поставщика',
        responsibleId: users['manager@crh.local'],
        departmentId: departments['Департамент закупок'],
        deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
        priority: ActionPriority.HIGH,
        status: ActionStatus.IN_PROGRESS,
        supportingDocs: 'Проект регламента',
        comments: 'Согласовывается с юридическим департаментом',
      },
    });
    await prisma.analysisActionItem.create({
      data: {
        analysisId: analysis1.id,
        recommendationId: rec2.id,
        task: 'Утвердить порядок взаимодействия с потенциальными поставщиками до объявления закупки',
        expectedResult: 'Утверждённый порядок, исключение неформальных контактов',
        responsibleId: users['officer@crh.local'],
        departmentId: departments['Департамент закупок'],
        deadline: new Date(new Date().setDate(new Date().getDate() + 45)),
        priority: ActionPriority.HIGH,
        status: ActionStatus.PLANNED,
      },
    });
    await prisma.analysisActionItem.create({
      data: {
        analysisId: analysis1.id,
        recommendationId: rec3.id,
        task: 'Внедрить форму декларации конфликта интересов при согласовании договоров',
        expectedResult: 'Форма декларации внедрена в процесс согласования договоров',
        responsibleId: users['manager@crh.local'],
        departmentId: departments['Департамент закупок'],
        deadline: new Date(new Date().setDate(new Date().getDate() + 20)),
        priority: ActionPriority.MEDIUM,
        status: ActionStatus.PLANNED,
      },
    });

    // Stage 11: Согласование
    await prisma.analysisComment.create({
      data: {
        analysisId: analysis1.id,
        authorId: users['officer@crh.local'],
        text: 'Проект анализа готов к согласованию. Просьба руководителей рабочей группы проверить план мероприятий перед утверждением.',
      },
    });
    await prisma.analysisComment.create({
      data: {
        analysisId: analysis1.id,
        authorId: users['manager@crh.local'],
        text: 'Согласовано. Рекомендую утвердить анализ и передать риски в реестр комплаенс-рисков.',
      },
    });
  }

  const existingAnalysis2 = await prisma.corruptionAnalysis.findFirst({
    where: { name: 'ВАКР кадровых процедур АО «Саутбридж Индастриз» за 2025 год' },
  });
  if (!existingAnalysis2) {
    await prisma.corruptionAnalysis.create({
      data: {
        code: 'ВАКР-2025-0001',
        name: 'ВАКР кадровых процедур АО «Саутбридж Индастриз» за 2025 год',
        companyId: southbridge.id,
        subject: 'Процессы найма, перемещения и увольнения персонала',
        legalBasis: 'Закон Республики Казахстан «О противодействии коррупции»',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-12-31'),
        deadline: new Date('2025-12-15'),
        leadId: users['deptmgr@crh.local'],
        stage: AnalysisStage.MONITORING,
        status: AnalysisStatus.COMPLETED,
        completedAt: new Date('2025-12-10'),
        createdById: users['officer@crh.local'],
        departments: {
          create: [{ departmentId: departments['Департамент операционной деятельности'] }],
        },
        workingGroup: {
          create: [
            {
              userId: users['deptmgr@crh.local'],
              role: 'Руководитель рабочей группы',
              functions: 'Общее руководство анализом',
              responsibilityArea: 'Кадровые процедуры',
              completed: true,
            },
          ],
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Академия комплаенса — демо-курсы и назначения
  // ------------------------------------------------------------------

  async function ensureCourse(spec: {
    title: string;
    description: string;
    status: CourseStatus;
    isMandatory: boolean;
    createdById: string;
    applicableRoles?: Role[];
    applicableDepartmentIds?: string[];
    modules: {
      order: number;
      title: string;
      lessons: {
        order: number;
        title: string;
        contentType: LessonContentType;
        content?: string;
        durationMinutes?: number;
        scheduledAt?: Date;
      }[];
    }[];
  }) {
    const existing = await prisma.course.findFirst({ where: { title: spec.title } });
    if (existing) {
      return prisma.course.update({
        where: { id: existing.id },
        data: {
          applicableRoles: spec.applicableRoles ?? [],
          applicableDepartments: {
            set: (spec.applicableDepartmentIds ?? []).map((id) => ({ id })),
          },
        },
      });
    }
    return prisma.course.create({
      data: {
        title: spec.title,
        description: spec.description,
        status: spec.status,
        isMandatory: spec.isMandatory,
        createdById: spec.createdById,
        applicableRoles: spec.applicableRoles ?? [],
        applicableDepartments: spec.applicableDepartmentIds
          ? { connect: spec.applicableDepartmentIds.map((id) => ({ id })) }
          : undefined,
        modules: {
          create: spec.modules.map((m) => ({
            order: m.order,
            title: m.title,
            lessons: { create: m.lessons },
          })),
        },
      },
    });
  }

  const course1 = await ensureCourse({
    title: 'Противодействие коррупции: базовый курс',
    description:
      'Обязательный вводный курс по антикоррупционному законодательству Республики Казахстан и корпоративной политике компании.',
    status: CourseStatus.PUBLISHED,
    isMandatory: true,
    createdById: users['officer@crh.local'],
    applicableRoles: [],
    modules: [
      {
        order: 1,
        title: 'Введение в антикоррупционную политику',
        lessons: [
          {
            order: 1,
            title: 'Основные понятия и законодательство РК',
            contentType: LessonContentType.ARTICLE,
            content: 'Обзор Закона РК «О противодействии коррупции» и ключевых понятий: коррупционное правонарушение, конфликт интересов, аффилированность.',
            durationMinutes: 20,
          },
          {
            order: 2,
            title: 'Политика компании по противодействию коррупции',
            contentType: LessonContentType.PRESENTATION,
            durationMinutes: 15,
          },
        ],
      },
      {
        order: 2,
        title: 'Практические аспекты',
        lessons: [
          {
            order: 1,
            title: 'Как распознать признаки коррупционных схем',
            contentType: LessonContentType.CASE_STUDY,
            durationMinutes: 30,
          },
          {
            order: 2,
            title: 'Итоговый чек-лист для сотрудников',
            contentType: LessonContentType.CHECKLIST,
            durationMinutes: 10,
          },
        ],
      },
    ],
  });

  const course2 = await ensureCourse({
    title: 'Конфликт интересов: выявление и урегулирование',
    description:
      'Курс о порядке выявления, декларирования и урегулирования конфликта интересов для руководителей и работников с полномочиями по принятию решений.',
    status: CourseStatus.PUBLISHED,
    isMandatory: true,
    createdById: users['manager@crh.local'],
    applicableRoles: [Role.DEPARTMENT_MANAGER, Role.RISK_OWNER, Role.BOARD],
    applicableDepartmentIds: [
      departments['Департамент закупок'],
      departments['Финансовый департамент'],
    ],
    modules: [
      {
        order: 1,
        title: 'Понятие конфликта интересов',
        lessons: [
          {
            order: 1,
            title: 'Виды конфликта интересов и примеры из практики',
            contentType: LessonContentType.ARTICLE,
            durationMinutes: 15,
          },
          {
            order: 2,
            title: 'Разбор кейсов: личная заинтересованность в закупках',
            contentType: LessonContentType.VIDEO,
            durationMinutes: 25,
          },
        ],
      },
      {
        order: 2,
        title: 'Процедура декларирования',
        lessons: [
          {
            order: 1,
            title: 'Порядок заполнения декларации о конфликте интересов',
            contentType: LessonContentType.INSTRUCTION,
            durationMinutes: 10,
          },
          {
            order: 2,
            title: 'Практическое задание: заполнение декларации',
            contentType: LessonContentType.PRACTICAL_TASK,
            durationMinutes: 20,
          },
        ],
      },
    ],
  });

  const course3 = await ensureCourse({
    title: 'Комплаенс для руководителей: расширенный курс',
    description:
      'Углублённый курс для руководителей о роли в системе комплаенса, управлении комплаенс-рисками подразделения и культуре нетерпимости к коррупции.',
    status: CourseStatus.DRAFT,
    isMandatory: false,
    createdById: users['officer@crh.local'],
    applicableRoles: [Role.DEPARTMENT_MANAGER, Role.COMPLIANCE_MANAGER, Role.BOARD],
    modules: [
      {
        order: 1,
        title: 'Роль руководителя в системе комплаенса',
        lessons: [
          {
            order: 1,
            title: 'Вебинар: ответственность руководителя за комплаенс-культуру',
            contentType: LessonContentType.WEBINAR,
            durationMinutes: 45,
            scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          {
            order: 2,
            title: 'Памятка руководителю по реагированию на сигналы',
            contentType: LessonContentType.MEMO,
            durationMinutes: 10,
          },
        ],
      },
    ],
  });

  const webinarLesson = await prisma.courseLesson.findFirst({
    where: { title: 'Вебинар: ответственность руководителя за комплаенс-культуру' },
  });
  if (webinarLesson && !webinarLesson.scheduledAt) {
    await prisma.courseLesson.update({
      where: { id: webinarLesson.id },
      data: { scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    });
  }

  const dayMs = 24 * 60 * 60 * 1000;
  async function ensureAssignment(spec: {
    courseId: string;
    userEmail: string;
    assignedByEmail: string;
    status: CourseAssignmentStatus;
    progressPercent: number;
    dueDateOffsetDays?: number;
    completed?: boolean;
  }) {
    const userId = users[spec.userEmail];
    const existing = await prisma.courseAssignment.findUnique({
      where: { courseId_userId: { courseId: spec.courseId, userId } },
    });
    if (existing) return existing;
    return prisma.courseAssignment.create({
      data: {
        courseId: spec.courseId,
        userId,
        assignedById: users[spec.assignedByEmail],
        status: spec.status,
        progressPercent: spec.progressPercent,
        dueDate: spec.dueDateOffsetDays !== undefined ? new Date(Date.now() + spec.dueDateOffsetDays * dayMs) : undefined,
        completedAt: spec.completed ? new Date(Date.now() - 3 * dayMs) : undefined,
      },
    });
  }

  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'admin@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.COMPLETED,
    progressPercent: 100,
    dueDateOffsetDays: -20,
    completed: true,
  });
  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'officer@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.IN_PROGRESS,
    progressPercent: 60,
    dueDateOffsetDays: 10,
  });
  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'manager@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.NOT_STARTED,
    progressPercent: 0,
    dueDateOffsetDays: -5,
  });
  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'owner@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.COMPLETED,
    progressPercent: 100,
    dueDateOffsetDays: -15,
    completed: true,
  });
  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'deptmgr@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.IN_PROGRESS,
    progressPercent: 30,
    dueDateOffsetDays: -3,
  });
  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'audit@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.NOT_STARTED,
    progressPercent: 0,
    dueDateOffsetDays: 25,
  });
  await ensureAssignment({
    courseId: course1.id,
    userEmail: 'board@crh.local',
    assignedByEmail: 'officer@crh.local',
    status: CourseAssignmentStatus.NOT_STARTED,
    progressPercent: 0,
    dueDateOffsetDays: 30,
  });

  await ensureAssignment({
    courseId: course2.id,
    userEmail: 'manager@crh.local',
    assignedByEmail: 'manager@crh.local',
    status: CourseAssignmentStatus.IN_PROGRESS,
    progressPercent: 50,
    dueDateOffsetDays: 12,
  });
  await ensureAssignment({
    courseId: course2.id,
    userEmail: 'owner@crh.local',
    assignedByEmail: 'manager@crh.local',
    status: CourseAssignmentStatus.COMPLETED,
    progressPercent: 100,
    dueDateOffsetDays: -8,
    completed: true,
  });
  await ensureAssignment({
    courseId: course2.id,
    userEmail: 'deptmgr@crh.local',
    assignedByEmail: 'manager@crh.local',
    status: CourseAssignmentStatus.NOT_STARTED,
    progressPercent: 0,
    dueDateOffsetDays: 20,
  });

  // ------------------------------------------------------------------
  // Академия комплаенса — Тестирование и Проверка знаний
  // ------------------------------------------------------------------

  async function ensureTest(
    courseId: string,
    spec: {
      title: string;
      passScorePercent?: number;
      questions: {
        order: number;
        type: TestQuestionType;
        text: string;
        points?: number;
        correctAnswerText?: string;
        options?: { order: number; text: string; isCorrect?: boolean }[];
      }[];
    },
  ) {
    const existing = await prisma.test.findUnique({
      where: { courseId },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
    if (existing) return existing;
    return prisma.test.create({
      data: {
        courseId,
        title: spec.title,
        passScorePercent: spec.passScorePercent ?? 70,
        questions: {
          create: spec.questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            points: q.points ?? 1,
            correctAnswerText: q.correctAnswerText,
            options: q.options ? { create: q.options } : undefined,
          })),
        },
      },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
  }

  const test1 = await ensureTest(course1.id, {
    title: 'Итоговый тест: Противодействие коррупции',
    passScorePercent: 70,
    questions: [
      {
        order: 1,
        type: TestQuestionType.SINGLE_CHOICE,
        text: 'Что из перечисленного является коррупционным правонарушением согласно законодательству РК?',
        options: [
          { order: 1, text: 'Получение взятки', isCorrect: true },
          { order: 2, text: 'Оформление ежегодного отпуска' },
          { order: 3, text: 'Подписание трудового договора' },
          { order: 4, text: 'Прохождение обязательного медосмотра' },
        ],
      },
      {
        order: 2,
        type: TestQuestionType.MULTIPLE_CHOICE,
        text: 'Какие из перечисленных действий относятся к мерам противодействия коррупции в компании?',
        points: 2,
        options: [
          { order: 1, text: 'Декларирование конфликта интересов', isCorrect: true },
          { order: 2, text: 'Раскрытие подарков сверх установленного лимита', isCorrect: true },
          { order: 3, text: 'Увеличение премии руководителю по своему усмотрению' },
          { order: 4, text: 'Обучение работников антикоррупционной политике компании', isCorrect: true },
        ],
      },
      {
        order: 3,
        type: TestQuestionType.TRUE_FALSE,
        text: 'Дарить подарки государственным служащим при исполнении ими служебных обязанностей запрещено.',
        options: [
          { order: 1, text: 'Верно', isCorrect: true },
          { order: 2, text: 'Неверно' },
        ],
      },
      {
        order: 4,
        type: TestQuestionType.SHORT_ANSWER,
        text: 'Назовите профильный закон Республики Казахстан, регулирующий противодействие коррупции.',
        correctAnswerText: 'О противодействии коррупции',
      },
    ],
  });

  const q = [...test1.questions].sort((a, b) => a.order - b.order);
  const correctOptionId = (question: (typeof q)[number]) => question.options.find((o) => o.isCorrect)?.id;
  const wrongOptionId = (question: (typeof q)[number]) => question.options.find((o) => !o.isCorrect)?.id;
  const correctOptionIds = (question: (typeof q)[number]) =>
    question.options.filter((o) => o.isCorrect).map((o) => o.id);

  async function ensureAttempt(spec: {
    userEmail: string;
    stage: TestAttemptStage;
    scorePercent: number;
    passed: boolean;
    answers: Record<string, unknown>;
  }) {
    const userId = users[spec.userEmail];
    const existing = await prisma.testAttempt.findUnique({
      where: { testId_userId_stage: { testId: test1.id, userId, stage: spec.stage } },
    });
    if (existing) return existing;
    return prisma.testAttempt.create({
      data: {
        testId: test1.id,
        userId,
        stage: spec.stage,
        scorePercent: spec.scorePercent,
        passed: spec.passed,
        answers: spec.answers as Prisma.InputJsonValue,
      },
    });
  }

  await ensureAttempt({
    userEmail: 'officer@crh.local',
    stage: TestAttemptStage.BEFORE,
    scorePercent: 25,
    passed: false,
    answers: {
      [q[0].id]: wrongOptionId(q[0]),
      [q[1].id]: [wrongOptionId(q[1])],
      [q[2].id]: wrongOptionId(q[2]),
      [q[3].id]: 'не знаю',
    },
  });
  await ensureAttempt({
    userEmail: 'officer@crh.local',
    stage: TestAttemptStage.AFTER,
    scorePercent: 100,
    passed: true,
    answers: {
      [q[0].id]: correctOptionId(q[0]),
      [q[1].id]: correctOptionIds(q[1]),
      [q[2].id]: correctOptionId(q[2]),
      [q[3].id]: 'О противодействии коррупции',
    },
  });
  await ensureAttempt({
    userEmail: 'manager@crh.local',
    stage: TestAttemptStage.BEFORE,
    scorePercent: 50,
    passed: false,
    answers: {
      [q[0].id]: correctOptionId(q[0]),
      [q[1].id]: [wrongOptionId(q[1])],
      [q[2].id]: correctOptionId(q[2]),
      [q[3].id]: 'не помню',
    },
  });

  // ------------------------------------------------------------------
  // Академия комплаенса — Сертификаты
  // ------------------------------------------------------------------

  async function ensureCertificate(spec: { courseId: string; userEmail: string; scorePercent?: number }) {
    const userId = users[spec.userEmail];
    const existing = await prisma.certificate.findUnique({
      where: { courseId_userId: { courseId: spec.courseId, userId } },
    });
    if (existing) return existing;
    const certificateNumber = `CRH-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    return prisma.certificate.create({
      data: { courseId: spec.courseId, userId, scorePercent: spec.scorePercent, certificateNumber },
    });
  }

  // course2 не имеет итогового теста — сертификат выдаётся по факту завершения.
  await ensureCertificate({ courseId: course2.id, userEmail: 'owner@crh.local' });
  // course1 имеет итоговый тест — сертификат выдаётся только при наличии успешной попытки.
  await ensureAttempt({
    userEmail: 'admin@crh.local',
    stage: TestAttemptStage.ANNUAL,
    scorePercent: 100,
    passed: true,
    answers: {
      [q[0].id]: correctOptionId(q[0]),
      [q[1].id]: correctOptionIds(q[1]),
      [q[2].id]: correctOptionId(q[2]),
      [q[3].id]: 'О противодействии коррупции',
    },
  });
  await ensureCertificate({ courseId: course1.id, userEmail: 'admin@crh.local', scorePercent: 100 });

  // ------------------------------------------------------------------
  // Академия комплаенса — Опросы
  // ------------------------------------------------------------------

  async function ensureSurvey(spec: {
    title: string;
    description: string;
    isAnonymous: boolean;
    status: SurveyStatus;
    createdById: string;
    questions: {
      order: number;
      type: SurveyQuestionType;
      text: string;
      options?: { order: number; text: string }[];
    }[];
  }) {
    const existing = await prisma.survey.findFirst({
      where: { title: spec.title },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
    if (existing) return existing;
    return prisma.survey.create({
      data: {
        title: spec.title,
        description: spec.description,
        isAnonymous: spec.isAnonymous,
        status: spec.status,
        createdById: spec.createdById,
        questions: {
          create: spec.questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            options: q.options ? { create: q.options } : undefined,
          })),
        },
      },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
  }

  const survey1 = await ensureSurvey({
    title: 'Опрос об этической культуре компании',
    description: 'Ежегодный анонимный опрос для оценки восприятия работниками этической культуры и каналов сообщения о нарушениях.',
    isAnonymous: true,
    status: SurveyStatus.PUBLISHED,
    createdById: users['officer@crh.local'],
    questions: [
      {
        order: 1,
        type: SurveyQuestionType.RATING,
        text: 'Насколько вы удовлетворены уровнем прозрачности решений в компании? (1 — совсем не удовлетворён, 5 — полностью удовлетворён)',
      },
      {
        order: 2,
        type: SurveyQuestionType.SINGLE_CHOICE,
        text: 'Как часто вы сталкиваетесь с ситуациями, вызывающими сомнения с этической точки зрения?',
        options: [
          { order: 1, text: 'Никогда' },
          { order: 2, text: 'Редко' },
          { order: 3, text: 'Иногда' },
          { order: 4, text: 'Часто' },
        ],
      },
      {
        order: 3,
        type: SurveyQuestionType.MULTIPLE_CHOICE,
        text: 'Какие каналы сообщения о нарушениях вам известны?',
        options: [
          { order: 1, text: 'Горячая линия' },
          { order: 2, text: 'Электронная почта комплаенс-службы' },
          { order: 3, text: 'Непосредственный руководитель' },
          { order: 4, text: 'Анонимная форма на портале' },
        ],
      },
      {
        order: 4,
        type: SurveyQuestionType.TEXT,
        text: 'Есть ли у вас предложения по улучшению этической культуры компании?',
      },
    ],
  });

  const sq = [...survey1.questions].sort((a, b) => a.order - b.order);
  const opt = (question: (typeof sq)[number], index: number) => question.options[index]?.id;

  async function ensureSurveyResponse(spec: { userEmail: string; answers: Record<string, unknown> }) {
    const userId = users[spec.userEmail];
    const existing = await prisma.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId: survey1.id, userId } },
    });
    if (existing) return existing;
    return prisma.surveyResponse.create({
      data: { surveyId: survey1.id, userId, answers: spec.answers as Prisma.InputJsonValue },
    });
  }

  await ensureSurveyResponse({
    userEmail: 'officer@crh.local',
    answers: {
      [sq[0].id]: 4,
      [sq[1].id]: opt(sq[1], 1),
      [sq[2].id]: [opt(sq[2], 0), opt(sq[2], 1)],
      [sq[3].id]: 'Больше открытых обсуждений на уровне подразделений.',
    },
  });
  await ensureSurveyResponse({
    userEmail: 'manager@crh.local',
    answers: {
      [sq[0].id]: 5,
      [sq[1].id]: opt(sq[1], 0),
      [sq[2].id]: [opt(sq[2], 0), opt(sq[2], 1), opt(sq[2], 3)],
      [sq[3].id]: '',
    },
  });
  await ensureSurveyResponse({
    userEmail: 'deptmgr@crh.local',
    answers: {
      [sq[0].id]: 3,
      [sq[1].id]: opt(sq[1], 2),
      [sq[2].id]: [opt(sq[2], 2)],
      [sq[3].id]: 'Регулярные встречи с комплаенс-службой по итогам года.',
    },
  });

  // ------------------------------------------------------------------
  // Комплаенс-кампании
  // ------------------------------------------------------------------

  async function ensureCampaign(spec: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    status: CampaignStatus;
    targetRoles: Role[];
    createdById: string;
    courseIds: string[];
    surveyIds: string[];
  }) {
    const existing = await prisma.campaign.findFirst({ where: { title: spec.title } });
    if (existing) return existing;
    return prisma.campaign.create({
      data: {
        title: spec.title,
        description: spec.description,
        startDate: spec.startDate,
        endDate: spec.endDate,
        status: spec.status,
        targetRoles: spec.targetRoles,
        createdById: spec.createdById,
        courses: { create: spec.courseIds.map((courseId) => ({ courseId })) },
        surveys: { create: spec.surveyIds.map((surveyId) => ({ surveyId })) },
      },
    });
  }

  await ensureCampaign({
    title: 'Ежегодная декларация конфликта интересов и обучение 2026',
    description:
      'Кампания объединяет прохождение курса по конфликту интересов и опрос об этической культуре для руководителей подразделений, владельцев рисков и совета директоров.',
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-12-31'),
    status: CampaignStatus.ACTIVE,
    targetRoles: [Role.DEPARTMENT_MANAGER, Role.RISK_OWNER, Role.BOARD],
    createdById: users['manager@crh.local'],
    courseIds: [course2.id],
    surveyIds: [survey1.id],
  });

  // ------------------------------------------------------------------
  // Академия комплаенса — Годовой план обучения
  // ------------------------------------------------------------------

  const trainingPlan2026 = await (async () => {
    const existing = await prisma.trainingPlan.findUnique({ where: { year: 2026 } });
    if (existing) return existing;
    return prisma.trainingPlan.create({
      data: {
        year: 2026,
        title: 'Годовой план обучения на 2026 год',
        status: TrainingPlanStatus.APPROVED,
        createdById: users['manager@crh.local'],
      },
    });
  })();

  async function ensurePlanItem(spec: {
    courseId: string;
    quarter: number;
    targetRoles: Role[];
    responsibleEmail: string;
    status: TrainingPlanItemStatus;
    notes: string;
  }) {
    const existing = await prisma.trainingPlanItem.findFirst({
      where: { planId: trainingPlan2026.id, courseId: spec.courseId, quarter: spec.quarter },
    });
    if (existing) return existing;
    return prisma.trainingPlanItem.create({
      data: {
        planId: trainingPlan2026.id,
        courseId: spec.courseId,
        quarter: spec.quarter,
        targetRoles: spec.targetRoles,
        responsibleId: users[spec.responsibleEmail],
        status: spec.status,
        notes: spec.notes,
      },
    });
  }

  await ensurePlanItem({
    courseId: course1.id,
    quarter: 1,
    targetRoles: [],
    responsibleEmail: 'officer@crh.local',
    status: TrainingPlanItemStatus.COMPLETED,
    notes: 'Обязательное ежегодное обучение для всех работников компании.',
  });
  await ensurePlanItem({
    courseId: course2.id,
    quarter: 2,
    targetRoles: [Role.DEPARTMENT_MANAGER, Role.RISK_OWNER, Role.BOARD],
    responsibleEmail: 'manager@crh.local',
    status: TrainingPlanItemStatus.IN_PROGRESS,
    notes: 'Проводится в рамках кампании «Ежегодная декларация конфликта интересов и обучение 2026».',
  });
  await ensurePlanItem({
    courseId: course3.id,
    quarter: 3,
    targetRoles: [Role.DEPARTMENT_MANAGER, Role.COMPLIANCE_MANAGER, Role.BOARD],
    responsibleEmail: 'officer@crh.local',
    status: TrainingPlanItemStatus.PLANNED,
    notes: 'Публикация курса запланирована на начало третьего квартала.',
  });
  await ensurePlanItem({
    courseId: course1.id,
    quarter: 4,
    targetRoles: [],
    responsibleEmail: 'officer@crh.local',
    status: TrainingPlanItemStatus.PLANNED,
    notes: 'Повторное прохождение для новых сотрудников, принятых в течение года.',
  });

  console.log(`Заполнение завершено. Создано рисков: ${created} (существующие риски не изменялись).`);
  console.log('Демонстрационные учётные записи: admin@crh.local / officer@crh.local / manager@crh.local / owner@crh.local /');
  console.log('                                  deptmgr@crh.local / audit@crh.local / board@crh.local');
  console.log(`Пароль для всех демонстрационных пользователей: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
