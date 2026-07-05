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

/// Stages 1-8 have a working UI in this phase; the rest are shown in the
/// wizard's progress bar as upcoming so users can see the full roadmap.
export const IMPLEMENTED_STAGES: AnalysisStage[] = [
  AnalysisStage.CREATION,
  AnalysisStage.PLANNING,
  AnalysisStage.WORKING_GROUP,
  AnalysisStage.DOCUMENTS,
  AnalysisStage.PROCESS_MAP,
  AnalysisStage.FACTORS,
  AnalysisStage.RISKS,
  AnalysisStage.ASSESSMENT,
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
