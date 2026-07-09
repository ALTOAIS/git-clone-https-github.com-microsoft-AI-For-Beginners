import { Logger } from '@nestjs/common';
import { TestQuestionType } from '@prisma/client';
import { AiControlSuggestion, AiRiskSuggestion } from '../types/ai-results';
import { ACADEMY_SYSTEM_PROMPT } from '../prompts/prompt-templates';
import { MockAiProvider } from './mock-ai.provider';
import {
  AiCallInfo,
  AiProvider,
  AnalysisFactsContext,
  CampaignMessageContext,
  CampaignMessageDraft,
  CaseStudyContext,
  CaseStudyDraft,
  ChatFactsContext,
  ControlSuggestionContext,
  CourseOutlineContext,
  CourseOutlineDraft,
  CrossModuleFactsContext,
  GenerateRiskForProcessContext,
  ImproveDescriptionContext,
  LessonContentContext,
  LessonContentDraft,
  MemoContext,
  MemoDraft,
  QuizDraft,
  QuizQuestionDraft,
  QuizQuestionsContext,
  ReportFactsContext,
  RiskRegisterFactsContext,
  RiskSuggestionContext,
  RiskTemplateDraft,
  SuggestRiskActionsContext,
} from './ai-provider.interface';

export interface RealAiOptions {
  /** openai | anthropic | anthropic-compatible (OpenAI-формат с кастомным baseUrl) */
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxInputChars: number;
}

const VALID_QUESTION_TYPES = new Set<string>([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
]);

/**
 * LLM-провайдер для генерации учебного контента Академии комплаенса.
 * Поддерживает OpenAI-совместимые endpoints и Anthropic Messages API.
 *
 * Учебные генерации (курс/урок/тест/кейс/памятка/рассылка) выполняются
 * через LLM; при любой ошибке (сеть, таймаут, невалидный JSON) метод
 * прозрачно возвращает результат MockAiProvider, а статус вызова
 * ERROR_FALLBACK с текстом ошибки попадает в AiInteractionLog.
 *
 * Методы ВАКР/реестра рисков делегируются MockAiProvider без изменений —
 * реальная LLM-интеграция этих модулей выходит за рамки Академии.
 */
export class RealAiProvider implements AiProvider {
  private readonly logger = new Logger(RealAiProvider.name);
  private lastCall?: AiCallInfo;

  constructor(
    private readonly options: RealAiOptions,
    private readonly fallback: MockAiProvider,
  ) {}

  get name(): string {
    return this.options.provider;
  }

  describeLastCall(): AiCallInfo | undefined {
    return this.lastCall;
  }

  // ------------------------------------------------------------------
  // Транспорт
  // ------------------------------------------------------------------

  private truncate(text: string | undefined): string | undefined {
    if (!text) return text;
    if (text.length <= this.options.maxInputChars) return text;
    return (
      text.slice(0, this.options.maxInputChars) +
      '\n…[материал усечён до лимита входных данных]'
    );
  }

  private async chatText(userPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      if (this.options.provider === 'anthropic') {
        const baseUrl = this.options.baseUrl ?? 'https://api.anthropic.com';
        const response = await fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.options.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.options.model,
            max_tokens: this.options.maxTokens,
            temperature: this.options.temperature,
            system: ACADEMY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        if (!response.ok) {
          throw new Error(
            `Anthropic API: HTTP ${response.status} ${await response.text().then((t) => t.slice(0, 300))}`,
          );
        }
        const data = (await response.json()) as {
          content?: { type: string; text?: string }[];
        };
        const text = data.content?.find((c) => c.type === 'text')?.text;
        if (!text) throw new Error('Anthropic API: пустой ответ');
        return text;
      }

      // openai | anthropic-compatible → OpenAI chat/completions формат
      const baseUrl = this.options.baseUrl ?? 'https://api.openai.com/v1';
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          temperature: this.options.temperature,
          max_tokens: this.options.maxTokens,
          messages: [
            { role: 'system', content: ACADEMY_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(
          `LLM API: HTTP ${response.status} ${await response.text().then((t) => t.slice(0, 300))}`,
        );
      }
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('LLM API: пустой ответ');
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseJson<T>(raw: string): T {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Ответ LLM не содержит JSON-объекта');
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }

  private async chatJson<T>(userPrompt: string): Promise<T> {
    return this.parseJson<T>(await this.chatText(userPrompt));
  }

  private async withFallback<T>(
    useCase: string,
    llm: () => Promise<T>,
    mock: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await llm();
      this.lastCall = {
        provider: this.options.provider,
        model: this.options.model,
        status: 'SUCCESS',
      };
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `LLM-вызов ${useCase} не удался, использую MockAiProvider: ${errorMessage}`,
      );
      const result = await mock();
      this.lastCall = {
        provider: this.options.provider,
        model: this.options.model,
        status: 'ERROR_FALLBACK',
        errorMessage,
      };
      return result;
    }
  }

  /** Делегирование в mock (модули вне Академии) с корректной пометкой в логе. */
  private delegated<T>(result: Promise<T>): Promise<T> {
    this.lastCall = { provider: 'mock', status: 'SUCCESS' };
    return result;
  }

  // ------------------------------------------------------------------
  // Академия — реальная LLM-генерация
  // ------------------------------------------------------------------

  async generateCourseOutline(
    ctx: CourseOutlineContext,
  ): Promise<CourseOutlineDraft> {
    return this.withFallback(
      'generateCourseOutline',
      async () => {
        const prompt =
          `Задача: составь структуру учебного курса по комплаенс.\n` +
          `Тема курса: ${ctx.topic}\n` +
          (ctx.audienceHint ? `Целевая аудитория: ${ctx.audienceHint}\n` : '') +
          (ctx.level ? `Уровень: ${ctx.level}\n` : '') +
          (ctx.durationHours
            ? `Ориентировочная длительность: ${ctx.durationHours} ч\n`
            : '') +
          (ctx.goals?.length
            ? `Цели обучения: ${ctx.goals.join('; ')}\n`
            : '') +
          `Количество модулей: ${Math.max(ctx.moduleCount, 1)}\n` +
          (ctx.sourceText
            ? `Материал-источник (используй его содержание):\n"""\n${this.truncate(ctx.sourceText)}\n"""\n`
            : '') +
          'Верни JSON вида {"title": "...", "description": "...", "goals": ["..."], ' +
          '"modules": [{"order": 1, "title": "...", "lessons": [{"order": 1, "title": "...", "contentType": "ARTICLE"|"CASE_STUDY", "content": "markdown-текст урока"}]}], ' +
          '"recommendedTest": {"title": "...", "questionCount": 5}, "recommendedCases": ["..."]}.';
        const draft = await this.chatJson<CourseOutlineDraft>(prompt);
        if (!Array.isArray(draft.modules) || !draft.description) {
          throw new Error('LLM вернул структуру курса в неожидаемом формате');
        }
        draft.modules = draft.modules.map((m, i) => ({
          order: m.order ?? i + 1,
          title: m.title,
          lessons: (m.lessons ?? []).map((l, j) => ({
            order: l.order ?? j + 1,
            title: l.title,
            contentType:
              l.contentType === 'CASE_STUDY' ? 'CASE_STUDY' : 'ARTICLE',
            content: l.content,
          })),
        }));
        return draft;
      },
      () => this.fallback.generateCourseOutline(ctx),
    );
  }

  async generateLessonContent(
    ctx: LessonContentContext,
  ): Promise<LessonContentDraft> {
    return this.withFallback(
      'generateLessonContent',
      async () => {
        const prompt =
          `Задача: напиши учебный урок для работников.\n` +
          `Тема курса: ${ctx.courseTopic}\n` +
          `Заголовок урока: ${ctx.lessonTitle}\n` +
          `Тип урока: ${ctx.contentType}\n` +
          (ctx.audienceHint ? `Аудитория: ${ctx.audienceHint}\n` : '') +
          (ctx.durationMinutes
            ? `Желаемая длительность: ~${ctx.durationMinutes} мин чтения\n`
            : '') +
          (ctx.sourceText
            ? `Материал-источник (используй его содержание):\n"""\n${this.truncate(ctx.sourceText)}\n"""\n`
            : '') +
          'Верни JSON вида {"goal": "цель урока", "content": "основной текст урока в markdown (заголовки, списки, пример из практики)", ' +
          '"keyPoints": ["ключевой тезис"], "practicalExample": "пример из практики", "selfCheckQuestions": ["вопрос для самопроверки"]}.';
        const draft = await this.chatJson<LessonContentDraft>(prompt);
        if (!draft.content) {
          throw new Error('LLM вернул урок без основного текста');
        }
        return draft;
      },
      () => this.fallback.generateLessonContent(ctx),
    );
  }

  private async llmQuiz(ctx: QuizQuestionsContext): Promise<QuizDraft> {
    const types = ctx.questionTypes?.length
      ? ctx.questionTypes
      : (['SINGLE_CHOICE'] as TestQuestionType[]);
    const prompt =
      `Задача: составь вопросы теста для проверки знаний работников.\n` +
      `Тема: ${ctx.topic}\n` +
      `Количество вопросов: ${ctx.questionCount}\n` +
      (ctx.difficulty ? `Сложность: ${ctx.difficulty}\n` : '') +
      `Допустимые типы вопросов: ${types.join(', ')} ` +
      '(SINGLE_CHOICE — один правильный ответ; MULTIPLE_CHOICE — несколько правильных; TRUE_FALSE — верно/неверно; ситуационный кейс оформляй как SINGLE_CHOICE с описанием ситуации в тексте вопроса)\n' +
      (ctx.sourceText
        ? `Материал-источник (вопросы должны опираться на него):\n"""\n${this.truncate(ctx.sourceText)}\n"""\n`
        : '') +
      'Верни JSON вида {"suggestedPassingScore": 70, "questions": [{"order": 1, "type": "SINGLE_CHOICE", "text": "...", "points": 10, ' +
      '"options": [{"order": 1, "text": "...", "isCorrect": true}], "explanation": "почему этот ответ правильный"}]}. ' +
      'У SINGLE_CHOICE и TRUE_FALSE ровно один вариант с isCorrect=true; у MULTIPLE_CHOICE — минимум два.';
    const draft = await this.chatJson<QuizDraft>(prompt);
    if (!Array.isArray(draft.questions) || draft.questions.length === 0) {
      throw new Error('LLM вернул тест без вопросов');
    }
    draft.questions = draft.questions.map((q, i) => ({
      order: q.order ?? i + 1,
      type: (VALID_QUESTION_TYPES.has(q.type)
        ? q.type
        : 'SINGLE_CHOICE') as TestQuestionType,
      text: q.text,
      points: q.points ?? 10,
      options: q.options?.map((o, j) => ({
        order: o.order ?? j + 1,
        text: o.text,
        isCorrect: !!o.isCorrect,
      })),
      correctAnswerText: q.correctAnswerText,
      explanation: q.explanation,
    }));
    const invalid = draft.questions.some(
      (q) =>
        q.type !== 'SHORT_ANSWER' &&
        (!q.options?.length || !q.options.some((o) => o.isCorrect)),
    );
    if (invalid) {
      throw new Error('LLM вернул вопросы без правильных вариантов ответа');
    }
    return draft;
  }

  async generateQuiz(ctx: QuizQuestionsContext): Promise<QuizDraft> {
    return this.withFallback(
      'generateQuiz',
      () => this.llmQuiz(ctx),
      () => this.fallback.generateQuiz(ctx),
    );
  }

  async generateQuizQuestions(
    ctx: QuizQuestionsContext,
  ): Promise<QuizQuestionDraft[]> {
    return (await this.generateQuiz(ctx)).questions;
  }

  async generateCaseStudy(ctx: CaseStudyContext): Promise<CaseStudyDraft> {
    return this.withFallback(
      'generateCaseStudy',
      async () => {
        const prompt =
          `Задача: составь учебный кейс (практическую ситуацию) для обучения работников.\n` +
          `Тема: ${ctx.topic}\n` +
          (ctx.audienceHint ? `Аудитория: ${ctx.audienceHint}\n` : '') +
          (ctx.sourceText
            ? `Материал-источник:\n"""\n${this.truncate(ctx.sourceText)}\n"""\n`
            : '') +
          'Верни JSON вида {"title": "...", "situation": "описание ситуации", "question": "вопрос к работнику", ' +
          '"options": [{"text": "вариант действий", "isCorrect": false}], "correctApproach": "правильный подход", ' +
          '"analysis": "разбор кейса", "complianceRiskLink": "с каким комплаенс-риском связан кейс"}. ' +
          'Ровно один вариант с isCorrect=true.';
        const draft = await this.chatJson<CaseStudyDraft>(prompt);
        if (
          !draft.situation ||
          !Array.isArray(draft.options) ||
          !draft.options.some((o) => o.isCorrect)
        ) {
          throw new Error('LLM вернул кейс в неожидаемом формате');
        }
        return draft;
      },
      () => this.fallback.generateCaseStudy(ctx),
    );
  }

  async generateMemo(ctx: MemoContext): Promise<MemoDraft> {
    return this.withFallback(
      'generateMemo',
      async () => {
        const prompt =
          `Задача: составь краткую памятку (чек-лист) для работников.\n` +
          `Тема: ${ctx.topic}\n` +
          (ctx.audienceHint ? `Аудитория: ${ctx.audienceHint}\n` : '') +
          (ctx.sourceText
            ? `Материал-источник:\n"""\n${this.truncate(ctx.sourceText)}\n"""\n`
            : '') +
          'Верни JSON вида {"title": "...", "summary": "краткая памятка (2-4 предложения)", "checklist": ["шаг"], ' +
          '"prohibited": ["что запрещено"], "required": ["что нужно сделать"], "contacts": "к кому обратиться"}.';
        const draft = await this.chatJson<MemoDraft>(prompt);
        if (!draft.summary || !Array.isArray(draft.checklist)) {
          throw new Error('LLM вернул памятку в неожидаемом формате');
        }
        return draft;
      },
      () => this.fallback.generateMemo(ctx),
    );
  }

  async generateCampaignMessage(
    ctx: CampaignMessageContext,
  ): Promise<CampaignMessageDraft> {
    return this.withFallback(
      'generateCampaignMessage',
      async () => {
        const prompt =
          `Задача: составь текст рассылки для информационной кампании комплаенс-обучения.\n` +
          `Тема: ${ctx.topic}\n` +
          (ctx.courseTitle ? `Связанный курс: ${ctx.courseTitle}\n` : '') +
          (ctx.sourceText
            ? `Материал-источник:\n"""\n${this.truncate(ctx.sourceText)}\n"""\n`
            : '') +
          'Верни JSON вида {"subject": "тема рассылки", "body": "короткий текст рассылки (до 120 слов)", ' +
          '"keyPoints": ["ключевой тезис"], "linkText": "текст ссылки на курс/материал", ' +
          '"surveyQuestions": ["вопрос короткого опроса (2-3 шт.)"]}.';
        const draft = await this.chatJson<CampaignMessageDraft>(prompt);
        if (!draft.subject || !draft.body) {
          throw new Error('LLM вернул рассылку в неожидаемом формате');
        }
        return draft;
      },
      () => this.fallback.generateCampaignMessage(ctx),
    );
  }

  // ------------------------------------------------------------------
  // Остальные модули — делегирование в MockAiProvider
  // ------------------------------------------------------------------

  suggestRisks(ctx: RiskSuggestionContext): Promise<AiRiskSuggestion[]> {
    return this.delegated(this.fallback.suggestRisks(ctx));
  }

  suggestControls(
    ctx: ControlSuggestionContext,
  ): Promise<AiControlSuggestion[]> {
    return this.delegated(this.fallback.suggestControls(ctx));
  }

  reviewAnalysis(ctx: AnalysisFactsContext): Promise<{
    missingConsiderations: string[];
    qualityIssues: string[];
    summary: string;
  }> {
    return this.delegated(this.fallback.reviewAnalysis(ctx));
  }

  generateExecutiveSummary(ctx: ReportFactsContext): Promise<string> {
    return this.delegated(this.fallback.generateExecutiveSummary(ctx));
  }

  proposeRiskRegisterEntry(ctx: RiskRegisterFactsContext): Promise<{
    title: string;
    description: string;
    categoryHint: string;
    justification: string;
  }> {
    return this.delegated(this.fallback.proposeRiskRegisterEntry(ctx));
  }

  chat(ctx: ChatFactsContext): Promise<string> {
    return this.delegated(this.fallback.chat(ctx));
  }

  generateCrossModuleInsights(ctx: CrossModuleFactsContext): Promise<string[]> {
    return this.delegated(this.fallback.generateCrossModuleInsights(ctx));
  }

  improveRiskDescription(
    ctx: ImproveDescriptionContext,
  ): Promise<{ improvedDescription: string }> {
    return this.delegated(this.fallback.improveRiskDescription(ctx));
  }

  suggestRiskActions(ctx: SuggestRiskActionsContext): Promise<string[]> {
    return this.delegated(this.fallback.suggestRiskActions(ctx));
  }

  generateRiskForProcess(
    ctx: GenerateRiskForProcessContext,
  ): Promise<RiskTemplateDraft> {
    return this.delegated(this.fallback.generateRiskForProcess(ctx));
  }
}
