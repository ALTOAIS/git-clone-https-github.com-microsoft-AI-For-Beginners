export type CefrLevel =
  | 'A1'
  | 'A1_PLUS'
  | 'A2'
  | 'A2_PLUS'
  | 'B1'
  | 'B1_PLUS'
  | 'B2'
  | 'C1';

export type AiMode = 'llm' | 'fallback';

/** Почему ответ ушёл в fallback: не настроен ИИ vs. провайдер временно недоступен. */
export type FallbackReason = 'not_configured' | 'llm_error' | 'invalid_json';

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  currentLevel: CefrLevel;
  dailyGoalMinutes: number;
  goals: string[];
  preferredTopics: string[];
  preferredLearningMethods: string[];
  selfAssessment?: Record<string, number> | null;
  reminderTime?: string | null;
  notificationSettings?: Record<string, boolean> | null;
  onboardingCompleted: boolean;
  streakDays: number;
  lastStudyDate?: string | null;
  skillProfile?: SkillProfile | null;
}

export interface SkillProfile {
  vocabulary: CefrLevel;
  grammar: CefrLevel;
  speaking: CefrLevel;
  listening: CefrLevel;
  reading: CefrLevel;
  writing: CefrLevel;
  strengths: string[];
  weaknesses: string[];
  summary?: string | null;
  lastAssessedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'currentLevel' | 'onboardingCompleted'>;
}

export interface Phrase {
  id: string;
  englishText: string;
  russianTranslation: string;
  category: string;
  cefrLevel: CefrLevel;
  exampleSentence?: string | null;
  pronunciationHint?: string | null;
  source: string;
  tags: string[];
  createdAt: string;
}

export interface UserPhrase {
  id: string;
  phraseId: string;
  masteryScore: number;
  reviewStage: number;
  nextReviewAt?: string | null;
  lastReviewedAt?: string | null;
  correctCount: number;
  incorrectCount: number;
  personalExample?: string | null;
  status: 'NEW' | 'LEARNING' | 'MASTERED' | 'DIFFICULT';
  createdAt: string;
  phrase: Phrase;
}

export interface ReviewTask {
  userPhraseId: string;
  phraseId: string;
  taskType: 'recognition' | 'translation' | 'sentence' | 'voice';
  english: string;
  russian: string;
  hint?: string;
  example?: string;
  stage: number;
  status: string;
  options?: string[];
}

export interface ReviewQueue {
  tasks: ReviewTask[];
  dueTotal: number;
  sessionSize: number;
  estimatedMinutes: number;
}

export type ReviewVerdict =
  | 'correct'
  | 'minor_error'
  | 'unnatural'
  | 'significant_error'
  | 'wrong';

export interface ReviewAnswerEvaluation {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
  verdict: ReviewVerdict;
  accepted: boolean;
  corrected: string;
  natural: string;
  rule: string;
  examples: string[];
  errors: DetectedError[];
  voiceAnswerId?: string;
  languageIssue?: LanguageIssueInfo;
}

export interface PlanTask {
  id: string;
  type: 'review' | 'lesson' | 'speaking' | 'errors' | 'voice';
  title: string;
  minutes: number;
  done: boolean;
  lessonId?: string;
  count?: number;
}

export interface DailyPlan {
  id: string;
  date: string;
  plannedMinutes: number;
  completionPercent: number;
  completedAt?: string | null;
  tasksJson: { busy: boolean; tasks: PlanTask[] };
}

export interface LessonPhrase {
  english: string;
  russian: string;
  hint?: string;
  example?: string;
  context?: string;
}

export interface TranslationTask {
  type: 'ru_en' | 'en_ru' | 'missing' | 'order';
  prompt: string;
  answer: string;
  words?: string[];
  acceptable?: string[];
}

export interface LessonContent {
  newPhrases: LessonPhrase[];
  grammarPoint?: { title: string; explanation: string; examples: string[] };
  translationTasks: TranslationTask[];
  personalPrompt: { phrase: string; instruction: string };
  speakingTask: { prompt: string; promptRu: string };
  dialogue: { title: string; aiOpening: string; questions: string[] };
  reviewQuestions?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  level: CefrLevel;
  durationMinutes: number;
  objective?: string | null;
  dayNumber?: number | null;
  contentJson: LessonContent;
  source: string;
  status: 'DRAFT' | 'READY' | 'ARCHIVED';
  aiGenerated: boolean;
  createdAt: string;
  attempts?: { id: string; completedAt?: string | null; score?: number | null }[];
  aiMode?: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
}

export interface LessonAttempt {
  id: string;
  lessonId: string;
  startedAt: string;
  completedAt?: string | null;
  score?: number | null;
}

export interface DetectedError {
  original: string;
  corrected: string;
  explanation: string;
  errorType: string;
}

export interface LanguageIssueInfo {
  detectedLanguage: 'RU' | 'MIXED' | 'EMPTY' | 'UNCLEAR';
  message: string;
  hint?: string;
  firstWord?: string;
  example?: string;
}

export interface TranslationEvaluation {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
  verdict: 'correct' | 'mostly_correct' | 'unnatural' | 'incorrect';
  correctAnswer: string;
  naturalAlternative?: string;
  explanation: string;
  errors: DetectedError[];
  languageIssue?: LanguageIssueInfo;
}

export interface SentenceEvaluation {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
  corrected: string;
  natural: string;
  explanation: string;
  errors: DetectedError[];
  languageIssue?: LanguageIssueInfo;
}

export interface TrainerTask {
  id: string;
  type: 'ru_en' | 'en_ru' | 'missing' | 'order' | 'voice_ru_en' | 'fix_error';
  prompt: string;
  answer: string;
  acceptable?: string[];
  words?: string[];
  hint?: string;
  explanation?: string;
}

export interface ErrorRecord {
  id: string;
  originalText: string;
  correctedText: string;
  explanation: string;
  errorType: string;
  source: string;
  personalExample?: string | null;
  occurrenceCount: number;
  status: 'NEW' | 'PRACTICING' | 'IMPROVING' | 'RESOLVED' | 'REPEATED';
  createdAt: string;
  updatedAt: string;
  practiceStatus?: ErrorPracticeStatus;
  sourceModule?: string | null;
  sourcePrompt?: string | null;
  sourceContext?: string | null;
  originalUserAnswer?: string | null;
}

export interface ErrorPracticeTask {
  id: string;
  instruction: string;
  originalText: string;
  errorType: string;
  explanation: string;
  status: string;
}

export type ErrorPracticeStatus =
  | 'NEW'
  | 'PRACTICING'
  | 'COMPLETED_TODAY'
  | 'SCHEDULED_REVIEW'
  | 'RECURRING'
  | 'MASTERED'
  | 'ARCHIVED';

export interface ErrorExercise {
  type: 'blank' | 'correct_sentence';
  prompt: string;
  answer: string;
}

export interface ErrorHelpDetails {
  simplified: string;
  formula?: string | null;
  contrast: { wrong: string; right: string };
}

export interface ErrorSessionTask {
  id: string;
  practiceStatus: ErrorPracticeStatus;
  errorType: string;
  occurrenceCount: number;
  successfulReviewCount: number;
  nextPracticeAt?: string | null;
  hasContext: boolean;
  sourceModule?: string | null;
  sourcePrompt?: string | null;
  sourceContext?: string | null;
  originalUserAnswer?: string | null;
  exercise: ErrorExercise;
  originalText: string;
  correctedText: string;
  explanation: string;
  additionalExample?: string | null;
  ruleDetails?: string | null;
  helpDetails: ErrorHelpDetails;
}

export interface ErrorDailySession {
  date: string;
  targetCount: number;
  completedCount: number;
  skippedCount: number;
  dispositionedCount: number;
  resolvedToday: number;
  scheduledToday: number;
  sessionComplete: boolean;
  tasks: ErrorSessionTask[];
  completedTasks: ErrorSessionTask[];
}

export interface ErrorPracticeSubmitResult {
  correct: boolean;
  correctedText: string;
  explanation: string;
  mastered?: boolean;
  nextReviewInDays?: number | null;
  record: ErrorSessionTask;
}

export interface SpeakingScenario {
  id: string;
  mode: string;
  titleRu: string;
  titleEn: string;
  level: string;
  estimatedMinutes: number;
  aiOpening: string;
  questions: string[];
}

export interface ScenariosResponse {
  modes: { id: string; ru: string }[];
  scenarios: SpeakingScenario[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface Conversation {
  id: string;
  scenario: string;
  mode: string;
  level: string;
  startedAt: string;
  completedAt?: string | null;
  transcriptJson: ConversationTurn[];
  feedbackJson?: SpeakingFeedback & { stats: SpeakingStats };
  speakingSeconds: number;
  userTurns: number;
  scenarioTitle?: string;
  aiMode?: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
}

export interface SpeakingTurnResult {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  reply: string;
  hintRu?: string;
  done: boolean;
}

export interface SpeakingFeedback {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
  wentWell: string[];
  mistakes: DetectedError[];
  betterPhrases: { original: string; better: string }[];
  vocabulary: { english: string; russian: string }[];
}

export interface SpeakingStats {
  speakingSeconds: number;
  userTurns: number;
  totalWords: number;
  avgWordsPerTurn: number;
  vocabularyVariety: number;
}

export interface DiagnosticQuestion {
  id: string;
  section: 'vocabulary' | 'grammar' | 'reading' | 'listening';
  prompt: string;
  passage?: string;
  audioText?: string;
  options: string[];
}

export interface DiagnosticOpenTask {
  id: string;
  section: 'writing' | 'speaking';
  prompt: string;
  promptEn: string;
}

export interface DiagnosticTest {
  choiceQuestions: DiagnosticQuestion[];
  openTasks: DiagnosticOpenTask[];
}

export interface DiagnosticResult {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
  sectionScores: Record<string, number>;
  levels: Record<string, CefrLevel>;
  overall: CefrLevel;
  strengths: string[];
  weaknesses: string[];
  recurringErrors: DetectedError[];
  summary: string;
  suggestedTrack: string;
  recommendedDailyMinutes: number;
  estimatedPath: string;
}

export interface ProgressOverview {
  currentLevel: CefrLevel;
  streakDays: number;
  skillProfile?: SkillProfile | null;
  activePhrases: number;
  masteredPhrases: number;
  reviewAccuracy: number | null;
  speakingMinutesTotal: number;
  speakingMinutesWeek: number;
  completedDialogues: number;
  completedLessons: number;
  studyMinutesTotal: number;
  topErrors: ErrorRecord[];
  achievements: { id: string; title: string; achieved: boolean }[];
  benchmarks: {
    id: string;
    month: string;
    prompt: string;
    transcript: string;
    wordCount: number;
    durationSec: number;
    createdAt: string;
  }[];
}

export interface UploadedMaterial {
  id: string;
  filename: string;
  fileType: string;
  extractedText?: string | null;
  textLength: number;
  processingStatus: 'PENDING' | 'READY' | 'FAILED' | 'DELETED';
  createdAt: string;
}

export interface ExtractedPhrasesResult {
  aiMode: AiMode;
  retryCount?: number;
  fallbackReason?: FallbackReason;
  providerStatus?: number;
  aiError?: string;
  phrases: {
    english: string;
    russian: string;
    category?: string;
    example?: string;
  }[];
}

export interface DailySummary {
  date: string;
  correctedErrorsToday: number;
  reviewsCompletedToday: number;
  speakingMinutesToday: number;
  newPhrasesToday: number;
  lessonsCompletedToday: number;
  streakDays: number;
  dailyGoalMet: boolean;
  speakingConfidenceNote?: string;
}

export interface DailyHistoryEntry {
  date: string;
  correctedErrors: number;
  reviewsCompleted: number;
  speakingMinutes: number;
  newPhrases: number;
  lessonsCompleted: number;
}

export type MicroCategory =
  | 'ARTICLES'
  | 'THIRD_PERSON_SINGULAR'
  | 'PRESENT_SIMPLE'
  | 'PRESENT_PERFECT'
  | 'PAST_SIMPLE'
  | 'PREPOSITIONS'
  | 'WORD_ORDER'
  | 'COMPLY_VS_COMPLIANCE'
  | 'MAKE_VS_DO'
  | 'COUNTABLE_VS_UNCOUNTABLE'
  | 'COLLOCATIONS'
  | 'COMPLIANCE_VOCABULARY';

export interface EligibleMicroLesson {
  category: MicroCategory;
  count: number;
  threshold: number;
  lookbackDays: number;
  examples: { original: string; corrected: string }[];
}

export interface MicroLessonExercise {
  id: string;
  type: 'fill_blank' | 'correct_sentence' | 'choice';
  prompt: string;
  options?: string[];
  answer: string;
}

export interface MicroLessonContent {
  ruleExplanation: string;
  additionalExamples: string[];
  exercises: MicroLessonExercise[];
}

export interface MicroLessonResult {
  results: { exerciseId: string; correct: boolean; correctAnswer: string; given: string }[];
  score: number;
  total: number;
}

export interface MicroLesson {
  id: string;
  category: MicroCategory;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  aiMode: AiMode | null;
  createdAt: string;
  completedAt?: string | null;
  resultJson?: MicroLessonResult | null;
  content: MicroLessonContent;
  userExamples: { original: string; corrected: string }[];
}
