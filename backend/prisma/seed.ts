import {
  ActionStatus,
  ControlEffectiveness,
  ControlType,
  IncidentAction,
  IncidentStatus,
  PrismaClient,
  Role,
  RiskStatus,
  SourceType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'ChangeMe123!';

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function score(l?: number, i?: number) {
  return l && i ? l * i : undefined;
}

async function main() {
  console.log('Seeding Compliance Risk Hub demo data...');

  // ---------------------------------------------------------------
  // Companies / Departments / Business processes
  // ---------------------------------------------------------------
  const northwind = await prisma.company.upsert({
    where: { name: 'Northwind Holdings' },
    update: {},
    create: { name: 'Northwind Holdings', description: 'Group holding company' },
  });
  const southbridge = await prisma.company.upsert({
    where: { name: 'Southbridge Industries' },
    update: {},
    create: { name: 'Southbridge Industries', description: 'Manufacturing subsidiary' },
  });

  const deptData: [string, string][] = [
    ['Procurement', northwind.id],
    ['Human Resources', northwind.id],
    ['Finance', northwind.id],
    ['Legal & Compliance', northwind.id],
    ['Operations', southbridge.id],
    ['Sales', southbridge.id],
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
    ['Vendor Onboarding', 'Procurement'],
    ['Tender Management', 'Procurement'],
    ['Recruitment', 'Human Resources'],
    ['Expense Reimbursement', 'Finance'],
    ['Contract Review', 'Legal & Compliance'],
    ['Production Line QA', 'Operations'],
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
  // Risk Library categories (tree)
  // ---------------------------------------------------------------
  async function upsertCategory(name: string, parentId?: string, description?: string) {
    const existing = await prisma.category.findFirst({ where: { name, parentId: parentId ?? null } });
    if (existing) return existing;
    return prisma.category.create({ data: { name, parentId, description } });
  }

  const corruption = await upsertCategory('Corruption & Bribery', undefined, 'Bribery, kickbacks and improper payments');
  const gifts = await upsertCategory('Gifts & Hospitality', corruption.id);
  const facilitation = await upsertCategory('Facilitation Payments', corruption.id);

  const thirdParty = await upsertCategory('Third-Party Risk', undefined, 'Risks arising from external parties');
  const counterpartyDd = await upsertCategory('Counterparty Due Diligence', thirdParty.id);
  const vendorRisk = await upsertCategory('Vendor Risk', thirdParty.id);

  const coi = await upsertCategory('Conflict of Interest');
  const fraud = await upsertCategory('Fraud');

  const esgCat = await upsertCategory('Data Privacy & ESG');
  const esgSub = await upsertCategory('ESG Compliance', esgCat.id);
  const dataProtection = await upsertCategory('Data Protection', esgCat.id);

  const regulatory = await upsertCategory('Regulatory & Legal');

  // ---------------------------------------------------------------
  // Users
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
    { email: 'admin@crh.local', fullName: 'Alex Morgan', role: Role.ADMINISTRATOR, title: 'System Administrator' },
    {
      email: 'officer@crh.local',
      fullName: 'Jamie Chen',
      role: Role.COMPLIANCE_OFFICER,
      title: 'Compliance Officer',
      companyId: northwind.id,
      departmentId: departments['Legal & Compliance'],
    },
    {
      email: 'manager@crh.local',
      fullName: 'Taylor Reid',
      role: Role.COMPLIANCE_MANAGER,
      title: 'Compliance Manager',
      companyId: northwind.id,
      departmentId: departments['Legal & Compliance'],
    },
    {
      email: 'owner@crh.local',
      fullName: 'Morgan Blake',
      role: Role.RISK_OWNER,
      title: 'Procurement Lead',
      companyId: northwind.id,
      departmentId: departments['Procurement'],
    },
    {
      email: 'deptmgr@crh.local',
      fullName: 'Casey Nolan',
      role: Role.DEPARTMENT_MANAGER,
      title: 'Operations Manager',
      companyId: southbridge.id,
      departmentId: departments['Operations'],
    },
    {
      email: 'audit@crh.local',
      fullName: 'Riley Adams',
      role: Role.INTERNAL_AUDIT,
      title: 'Internal Auditor',
      companyId: northwind.id,
    },
    { email: 'board@crh.local', fullName: 'Jordan Wells', role: Role.BOARD, title: 'Board Member' },
  ];

  const users: Record<string, string> = {};
  for (const spec of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: { ...spec, passwordHash },
    });
    users[spec.email] = user.id;
  }

  // ---------------------------------------------------------------
  // Sources
  // ---------------------------------------------------------------
  const sourceSpecs: Array<{ type: SourceType; title: string; description?: string }> = [
    { type: SourceType.HOTLINE, title: 'Whistleblower report #2026-014', description: 'Anonymous hotline tip' },
    { type: SourceType.AUDIT, title: 'Internal Audit Q1 2026', description: 'Quarterly internal audit findings' },
    { type: SourceType.COUNTERPARTY_DUE_DILIGENCE, title: 'Vendor DD - Acme Supplies' },
    { type: SourceType.CANDIDATE_DUE_DILIGENCE, title: 'Candidate DD - Senior Buyer role' },
    { type: SourceType.MEDIA, title: 'Press coverage - industry bribery scandal' },
    { type: SourceType.STATE_INSPECTION, title: 'Regulator inspection notice' },
    { type: SourceType.GIFTS, title: 'Gift register entry - Q2 2026' },
    { type: SourceType.CONFLICT_OF_INTEREST, title: 'COI disclosure - Finance director' },
    { type: SourceType.PROCUREMENT, title: 'Procurement anomaly flagged by ERP' },
    { type: SourceType.ESG, title: 'ESG supplier assessment' },
    { type: SourceType.INVESTIGATION, title: 'Investigation case #INV-2026-002' },
    { type: SourceType.CORRUPTION_RISK_ASSESSMENT, title: 'Annual corruption risk assessment 2026' },
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
  // Risks + controls + actions + incidents + comments
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
      title: 'Bribery risk in vendor selection process',
      description: 'Risk of improper payments influencing vendor selection during tenders.',
      categoryId: corruption.id,
      companyId: northwind.id,
      departmentId: departments['Procurement'],
      businessProcessId: processes['Tender Management'],
      ownerId: users['owner@crh.local'],
      status: RiskStatus.MONITORING,
      likelihood: 4,
      impact: 5,
      residualLikelihood: 2,
      residualImpact: 4,
      sourceTitles: ['Internal Audit Q1 2026', 'Procurement anomaly flagged by ERP'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Dual approval on tenders above threshold', effectiveness: ControlEffectiveness.EFFECTIVE },
        { type: ControlType.DETECTIVE, title: 'Automated ERP anomaly detection', effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE },
      ],
      actions: [
        { title: 'Roll out enhanced vendor scoring model', status: ActionStatus.IN_PROGRESS, deadlineOffsetDays: 20, ownerEmail: 'owner@crh.local' },
        { title: 'Retrain procurement staff on anti-bribery policy', status: ActionStatus.OVERDUE, deadlineOffsetDays: -5, ownerEmail: 'owner@crh.local' },
      ],
    },
    {
      title: 'Excessive gifts and hospitality to public officials',
      description: 'Risk of gifts exceeding policy thresholds being offered to government counterparts.',
      categoryId: gifts.id,
      companyId: northwind.id,
      departmentId: departments['Legal & Compliance'],
      ownerId: users['officer@crh.local'],
      status: RiskStatus.APPROVED,
      likelihood: 3,
      impact: 4,
      sourceTitles: ['Gift register entry - Q2 2026'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Gift pre-approval workflow', effectiveness: ControlEffectiveness.EFFECTIVE },
      ],
      actions: [
        { title: 'Publish updated gifts & hospitality policy', status: ActionStatus.PLANNED, deadlineOffsetDays: 30, ownerEmail: 'officer@crh.local' },
      ],
    },
    {
      title: 'Inadequate due diligence on high-risk counterparties',
      description: 'Counterparty onboarding may not sufficiently screen for sanctions or PEP exposure.',
      categoryId: counterpartyDd.id,
      companyId: northwind.id,
      departmentId: departments['Procurement'],
      businessProcessId: processes['Vendor Onboarding'],
      ownerId: users['owner@crh.local'],
      status: RiskStatus.MITIGATION,
      likelihood: 4,
      impact: 4,
      residualLikelihood: 2,
      residualImpact: 3,
      sourceTitles: ['Vendor DD - Acme Supplies'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Sanctions & PEP screening at onboarding', effectiveness: ControlEffectiveness.EFFECTIVE },
        { type: ControlType.CORRECTIVE, title: 'Offboarding of flagged counterparties', effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE },
      ],
      actions: [
        { title: 'Implement continuous sanctions monitoring', status: ActionStatus.IN_PROGRESS, deadlineOffsetDays: 15, ownerEmail: 'owner@crh.local' },
      ],
    },
    {
      title: 'Undisclosed conflicts of interest in finance leadership',
      description: 'Risk that undisclosed financial interests influence finance decision-making.',
      categoryId: coi.id,
      companyId: northwind.id,
      departmentId: departments['Finance'],
      ownerId: users['manager@crh.local'],
      status: RiskStatus.RESIDUAL_ASSESSMENT,
      likelihood: 3,
      impact: 4,
      residualLikelihood: 1,
      residualImpact: 3,
      sourceTitles: ['COI disclosure - Finance director'],
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Annual COI disclosure attestation', effectiveness: ControlEffectiveness.EFFECTIVE },
      ],
      actions: [
        { title: 'Review finance director disclosure', status: ActionStatus.COMPLETED, deadlineOffsetDays: -10, ownerEmail: 'manager@crh.local' },
      ],
    },
    {
      title: 'Expense fraud via inflated reimbursement claims',
      description: 'Employees submitting inflated or fictitious expense claims.',
      categoryId: fraud.id,
      companyId: northwind.id,
      departmentId: departments['Finance'],
      businessProcessId: processes['Expense Reimbursement'],
      ownerId: users['manager@crh.local'],
      status: RiskStatus.CLOSED,
      likelihood: 2,
      impact: 3,
      residualLikelihood: 1,
      residualImpact: 2,
      controls: [
        { type: ControlType.DETECTIVE, title: 'Automated expense anomaly flagging', effectiveness: ControlEffectiveness.EFFECTIVE },
      ],
      actions: [
        { title: 'Close out finance investigation', status: ActionStatus.COMPLETED, deadlineOffsetDays: -30, ownerEmail: 'manager@crh.local' },
      ],
    },
    {
      title: 'Data privacy breach in candidate screening data',
      description: 'HR may retain candidate personal data beyond required retention periods.',
      categoryId: dataProtection.id,
      companyId: northwind.id,
      departmentId: departments['Human Resources'],
      businessProcessId: processes['Recruitment'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.ASSESSMENT,
      likelihood: 3,
      impact: 3,
      sourceTitles: ['Candidate DD - Senior Buyer role'],
      actions: [
        { title: 'Define candidate data retention schedule', status: ActionStatus.PLANNED, deadlineOffsetDays: 45, ownerEmail: 'deptmgr@crh.local' },
      ],
    },
    {
      title: 'Supplier ESG non-compliance in manufacturing supply chain',
      description: 'Key suppliers may not meet environmental and labor standards.',
      categoryId: esgSub.id,
      companyId: southbridge.id,
      departmentId: departments['Operations'],
      businessProcessId: processes['Production Line QA'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.NEW,
      sourceTitles: ['ESG supplier assessment'],
    },
    {
      title: 'Regulatory non-compliance following state inspection findings',
      description: 'Findings from a recent regulator inspection indicate control gaps.',
      categoryId: regulatory.id,
      companyId: southbridge.id,
      departmentId: departments['Operations'],
      ownerId: users['officer@crh.local'],
      status: RiskStatus.DRAFT,
      sourceTitles: ['Regulator inspection notice'],
    },
    {
      title: 'Facilitation payments at customs clearance',
      description: 'Local logistics staff may make small facilitation payments to expedite customs clearance.',
      categoryId: facilitation.id,
      companyId: southbridge.id,
      departmentId: departments['Operations'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.MONITORING,
      likelihood: 3,
      impact: 3,
      residualLikelihood: 2,
      residualImpact: 2,
      controls: [
        { type: ControlType.PREVENTIVE, title: 'Pre-cleared customs broker agreements', effectiveness: ControlEffectiveness.PARTIALLY_EFFECTIVE },
      ],
      actions: [
        { title: 'Audit customs broker payment records', status: ActionStatus.IN_PROGRESS, deadlineOffsetDays: 10, ownerEmail: 'deptmgr@crh.local' },
      ],
    },
    {
      title: 'Vendor concentration risk in critical raw materials',
      description: 'Over-reliance on a small number of vendors for critical raw materials.',
      categoryId: vendorRisk.id,
      companyId: southbridge.id,
      departmentId: departments['Operations'],
      ownerId: users['deptmgr@crh.local'],
      status: RiskStatus.APPROVED,
      likelihood: 3,
      impact: 5,
      sourceTitles: ['Vendor DD - Acme Supplies'],
      actions: [
        { title: 'Qualify two additional alternate suppliers', status: ActionStatus.PLANNED, deadlineOffsetDays: 60, ownerEmail: 'deptmgr@crh.local' },
      ],
    },
    {
      title: 'Historical bribery allegation now archived',
      description: 'Legacy allegation investigated and closed with no findings; retained for reference.',
      categoryId: corruption.id,
      companyId: northwind.id,
      departmentId: departments['Legal & Compliance'],
      ownerId: users['officer@crh.local'],
      status: RiskStatus.ARCHIVED,
      likelihood: 2,
      impact: 3,
      residualLikelihood: 1,
      residualImpact: 1,
      sourceTitles: ['Investigation case #INV-2026-002'],
    },
    {
      title: 'Media allegations of anti-competitive practices',
      description: 'Press reports allege anti-competitive coordination in a regional market.',
      categoryId: regulatory.id,
      companyId: northwind.id,
      departmentId: departments['Legal & Compliance'],
      ownerId: users['manager@crh.local'],
      status: RiskStatus.ASSESSMENT,
      likelihood: 2,
      impact: 5,
      sourceTitles: ['Press coverage - industry bribery scandal'],
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
            result: action.status === ActionStatus.COMPLETED ? 'Completed as planned.' : undefined,
          },
        });
      }
    }

    await prisma.comment.create({
      data: {
        riskId: risk.id,
        authorId: users['officer@crh.local'],
        text: `Risk registered and routed for ${spec.status.toLowerCase().replace('_', ' ')}.`,
      },
    });

    await prisma.riskHistory.create({
      data: {
        riskId: risk.id,
        version: 1,
        snapshot: JSON.parse(JSON.stringify(risk)),
        changedById: users['officer@crh.local'],
        changeNote: 'Initial creation via seed data',
      },
    });

    created += 1;
  }

  // A couple of incidents linked to risks, demonstrating the incident->risk lifecycle actions
  const briberyRisk = await prisma.risk.findFirst({ where: { title: 'Bribery risk in vendor selection process' } });
  if (briberyRisk) {
    const existingIncident = await prisma.incident.findFirst({ where: { title: 'Hotline tip on vendor kickback' } });
    if (!existingIncident) {
      await prisma.incident.create({
        data: {
          title: 'Hotline tip on vendor kickback',
          description: 'Anonymous tip alleging kickbacks in vendor selection.',
          status: IncidentStatus.UNDER_REVIEW,
          action: IncidentAction.UPDATE_RISK,
          sourceId: sources['Whistleblower report #2026-014'],
          riskId: briberyRisk.id,
          reportedById: users['audit@crh.local'],
        },
      });
    }
  }

  console.log(`Seed complete. ${created} risks created (existing risks left untouched).`);
  console.log('Demo login: admin@crh.local / officer@crh.local / manager@crh.local / owner@crh.local /');
  console.log('            deptmgr@crh.local / audit@crh.local / board@crh.local');
  console.log(`Password for all demo users: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
