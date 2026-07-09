import {
  BookOutlined,
  CopyOutlined,
  FileTextOutlined,
  MailOutlined,
  NotificationOutlined,
  ReadOutlined,
  ReloadOutlined,
  RobotOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Collapse,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { academyApi, aiApi, campaignsApi } from '../../api/endpoints';
import type {
  AiCampaignMessageDraft,
  AiCaseStudyDraft,
  AiCourseOutlineDraft,
  AiLessonContentResult,
  AiMemoDraft,
  AiQuizQuestionsResult,
  CourseDetail,
  TestQuestionType,
} from '../../types';

type StudioAction = 'course' | 'lesson' | 'quiz' | 'case' | 'memo' | 'campaign';

const ACTIONS: { key: StudioAction; icon: React.ReactNode }[] = [
  { key: 'course', icon: <BookOutlined /> },
  { key: 'lesson', icon: <ReadOutlined /> },
  { key: 'quiz', icon: <SolutionOutlined /> },
  { key: 'case', icon: <FileTextOutlined /> },
  { key: 'memo', icon: <NotificationOutlined /> },
  { key: 'campaign', icon: <MailOutlined /> },
];

const LEVEL_OPTIONS = [
  { value: 'базовый', label: 'Базовый' },
  { value: 'средний', label: 'Средний' },
  { value: 'продвинутый', label: 'Продвинутый' },
];

const QUESTION_TYPE_OPTIONS: { value: TestQuestionType; label: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Один правильный ответ' },
  { value: 'MULTIPLE_CHOICE', label: 'Несколько правильных ответов' },
  { value: 'TRUE_FALSE', label: 'Верно / неверно' },
];

function composeLessonMarkdown(draft: AiLessonContentResult): string {
  let md = draft.content.trim();
  if (draft.keyPoints?.length) {
    md += `\n\n### Ключевые тезисы\n${draft.keyPoints.map((p) => `- ${p}`).join('\n')}`;
  }
  if (draft.practicalExample && !md.includes(draft.practicalExample)) {
    md += `\n\n### Пример из практики\n${draft.practicalExample}`;
  }
  if (draft.selfCheckQuestions?.length) {
    md += `\n\n### Вопросы для самопроверки\n${draft.selfCheckQuestions.map((q) => `- ${q}`).join('\n')}`;
  }
  return md;
}

function composeCaseMarkdown(draft: AiCaseStudyDraft): string {
  return (
    `## ${draft.title}\n\n**Ситуация.** ${draft.situation}\n\n**Вопрос.** ${draft.question}\n\n` +
    `**Варианты действий:**\n${draft.options.map((o, i) => `${i + 1}. ${o.text}`).join('\n')}\n\n` +
    `**Правильный подход.** ${draft.correctApproach}\n\n**Разбор.** ${draft.analysis}\n\n` +
    `**Связь с комплаенс-риском.** ${draft.complianceRiskLink}`
  );
}

function composeMemoMarkdown(draft: AiMemoDraft): string {
  return (
    `## ${draft.title}\n\n${draft.summary}\n\n### Чек-лист действий\n${draft.checklist.map((i) => `- [ ] ${i}`).join('\n')}\n\n` +
    `### Что запрещено\n${draft.prohibited.map((i) => `- ${i}`).join('\n')}\n\n` +
    `### Что нужно сделать\n${draft.required.map((i) => `- ${i}`).join('\n')}\n\n### К кому обратиться\n${draft.contacts}`
  );
}

export function AiTrainingStudio() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [action, setAction] = useState<StudioAction | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paramsForm] = Form.useForm();
  const [saveForm] = Form.useForm();

  const [courseDraft, setCourseDraft] = useState<AiCourseOutlineDraft | null>(null);
  const [lessonDraft, setLessonDraft] = useState<AiLessonContentResult | null>(null);
  const [quizDraft, setQuizDraft] = useState<AiQuizQuestionsResult | null>(null);
  const [caseDraft, setCaseDraft] = useState<AiCaseStudyDraft | null>(null);
  const [memoDraft, setMemoDraft] = useState<AiMemoDraft | null>(null);
  const [campaignDraft, setCampaignDraft] = useState<AiCampaignMessageDraft | null>(null);
  const [editableMarkdown, setEditableMarkdown] = useState('');

  const { data: materials } = useQuery({
    queryKey: ['academy-materials'],
    queryFn: () => academyApi.listMaterials().then((r) => r.data),
  });
  const { data: coursesPage } = useQuery({
    queryKey: ['courses-for-studio'],
    queryFn: () => academyApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const [targetCourse, setTargetCourse] = useState<CourseDetail | null>(null);

  // Deep-link из карточки материала: ?action=course&materialId=...
  useEffect(() => {
    const linkedAction = searchParams.get('action') as StudioAction | null;
    if (linkedAction && ACTIONS.some((a) => a.key === linkedAction)) {
      setAction(linkedAction);
      const materialId = searchParams.get('materialId');
      if (materialId) {
        paramsForm.setFieldValue('materialAttachmentId', materialId);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      next.delete('materialId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, paramsForm]);

  const resetDrafts = () => {
    setCourseDraft(null);
    setLessonDraft(null);
    setQuizDraft(null);
    setCaseDraft(null);
    setMemoDraft(null);
    setCampaignDraft(null);
    setEditableMarkdown('');
  };

  const closeDrawer = () => {
    setAction(null);
    resetDrafts();
    paramsForm.resetFields();
    saveForm.resetFields();
    setTargetCourse(null);
  };

  const handleGenerate = async () => {
    const values = await paramsForm.validateFields();
    setGenerating(true);
    try {
      if (action === 'course') {
        const { data } = await aiApi.generateCourseOutline({
          topic: values.topic,
          audienceHint: values.audienceHint,
          level: values.level,
          durationHours: values.durationHours,
          moduleCount: values.moduleCount ?? 3,
          goals: values.goals
            ? String(values.goals)
                .split('\n')
                .map((g: string) => g.trim())
                .filter(Boolean)
            : undefined,
          materialAttachmentId: values.materialAttachmentId,
        });
        setCourseDraft(data);
      } else if (action === 'lesson') {
        const { data } = await aiApi.generateLessonContent({
          courseTopic: values.topic,
          lessonTitle: values.lessonTitle ?? values.topic,
          contentType: 'ARTICLE',
          audienceHint: values.audienceHint,
          durationMinutes: values.durationMinutes,
          materialAttachmentId: values.materialAttachmentId,
        });
        setLessonDraft(data);
        setEditableMarkdown(composeLessonMarkdown(data));
      } else if (action === 'quiz') {
        const { data } = await aiApi.generateQuizQuestions({
          topic: values.topic,
          questionCount: values.questionCount ?? 5,
          difficulty: values.difficulty,
          questionTypes: values.questionTypes,
          materialAttachmentId: values.materialAttachmentId,
        });
        setQuizDraft(data);
      } else if (action === 'case') {
        const { data } = await aiApi.generateCaseStudy({
          topic: values.topic,
          audienceHint: values.audienceHint,
          materialAttachmentId: values.materialAttachmentId,
        });
        setCaseDraft(data);
        setEditableMarkdown(composeCaseMarkdown(data));
      } else if (action === 'memo') {
        const { data } = await aiApi.generateMemo({
          topic: values.topic,
          audienceHint: values.audienceHint,
          materialAttachmentId: values.materialAttachmentId,
        });
        setMemoDraft(data);
        setEditableMarkdown(composeMemoMarkdown(data));
      } else if (action === 'campaign') {
        const { data } = await aiApi.generateCampaignMessage({
          topic: values.topic,
          courseTitle: values.courseTitle,
          materialAttachmentId: values.materialAttachmentId,
        });
        setCampaignDraft(data);
      }
    } catch {
      message.error(t('aiStudio.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const loadTargetCourse = useCallback(async (courseId: string) => {
    const { data } = await academyApi.get(courseId);
    setTargetCourse(data);
    return data;
  }, []);

  const handleSaveCourse = async () => {
    if (!courseDraft) return;
    setSaving(true);
    try {
      const { data: course } = await academyApi.create({
        title: courseDraft.title ?? paramsForm.getFieldValue('topic'),
        description:
          courseDraft.description +
          (courseDraft.goals?.length
            ? `\n\nЦели обучения:\n${courseDraft.goals.map((g) => `— ${g}`).join('\n')}`
            : ''),
      });
      for (const [moduleIndex, moduleDraft] of courseDraft.modules.entries()) {
        const { data: createdModule } = await academyApi.addModule(course.id, {
          order: moduleDraft.order ?? moduleIndex + 1,
          title: moduleDraft.title,
        });
        for (const [lessonIndex, lessonDraftItem] of moduleDraft.lessons.entries()) {
          await academyApi.addLesson(course.id, (createdModule as { id: string }).id, {
            order: lessonDraftItem.order ?? lessonIndex + 1,
            title: lessonDraftItem.title,
            contentType: lessonDraftItem.contentType,
            content: lessonDraftItem.content,
          });
        }
      }
      message.success(t('aiStudio.courseCreated'));
      closeDrawer();
      navigate(`/academy/courses/${course.id}`);
    } catch {
      message.error(t('aiStudio.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLessonLike = async (contentType: string, title: string) => {
    const values = await saveForm.validateFields();
    setSaving(true);
    try {
      const course = targetCourse ?? (await loadTargetCourse(values.courseId));
      const module = course.modules.find((m) => m.id === values.moduleId);
      await academyApi.addLesson(values.courseId, values.moduleId, {
        order: (module?.lessons.length ?? 0) + 1,
        title,
        contentType,
        content: editableMarkdown,
      });
      message.success(t('aiStudio.lessonAdded'));
      closeDrawer();
    } catch {
      message.error(t('aiStudio.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizDraft) return;
    const values = await saveForm.validateFields();
    setSaving(true);
    try {
      let test;
      try {
        test = (await academyApi.getTest(values.courseId)).data;
      } catch {
        test = null;
      }
      if (!test) {
        await academyApi.createTest(values.courseId, {
          title: `Итоговый тест: ${paramsForm.getFieldValue('topic')}`,
          passScorePercent: quizDraft.suggestedPassingScore ?? 70,
        });
        test = (await academyApi.getTest(values.courseId)).data;
      }
      const existingCount = test.questions?.length ?? 0;
      for (const [index, question] of quizDraft.questions.entries()) {
        await academyApi.addQuestion(values.courseId, {
          order: existingCount + index + 1,
          type: question.type,
          text: question.text + (question.explanation ? `\n\nПояснение (после прохождения): ${question.explanation}` : ''),
          points: question.points,
          correctAnswerText: question.correctAnswerText,
          options: question.options,
        });
      }
      message.success(t('aiStudio.questionsAdded', { count: quizDraft.questions.length }));
      closeDrawer();
    } catch {
      message.error(t('aiStudio.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignDraft) return;
    setSaving(true);
    try {
      await campaignsApi.create({
        name: campaignDraft.subject,
        description:
          `${campaignDraft.body}\n\nКлючевые тезисы:\n${campaignDraft.keyPoints.map((p) => `— ${p}`).join('\n')}` +
          (campaignDraft.surveyQuestions.length
            ? `\n\nВопросы короткого опроса:\n${campaignDraft.surveyQuestions.map((q) => `— ${q}`).join('\n')}`
            : ''),
      });
      message.success(t('aiStudio.campaignCreated'));
      closeDrawer();
    } catch {
      message.error(t('aiStudio.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(t('aiStudio.copied'));
  };

  const hasDraft =
    !!courseDraft || !!lessonDraft || !!quizDraft || !!caseDraft || !!memoDraft || !!campaignDraft;

  const materialOptions = materials?.map((m) => ({
    value: m.id,
    label: `${m.fileName}${m.courseTitle ? ` (${m.courseTitle})` : ''}`,
  }));

  const courseOptions = coursesPage?.items.map((c) => ({ value: c.id, label: c.title }));

  const sourceLimitation =
    courseDraft?.sourceLimitation ??
    lessonDraft?.sourceLimitation ??
    quizDraft?.sourceLimitation ??
    caseDraft?.sourceLimitation ??
    memoDraft?.sourceLimitation ??
    campaignDraft?.sourceLimitation;

  const disclaimer =
    courseDraft?.disclaimer ??
    lessonDraft?.disclaimer ??
    quizDraft?.disclaimer ??
    caseDraft?.disclaimer ??
    memoDraft?.disclaimer ??
    campaignDraft?.disclaimer;

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<RobotOutlined />}
        message={t('aiStudio.intro')}
        description={t('aiStudio.introDescription')}
        style={{ marginBottom: 16 }}
      />
      <Row gutter={[16, 16]}>
        {ACTIONS.map(({ key, icon }) => (
          <Col xs={24} sm={12} lg={8} key={key}>
            <Card
              hoverable
              onClick={() => {
                resetDrafts();
                setAction(key);
              }}
            >
              <Space align="start">
                <span style={{ fontSize: 28, color: '#1677ff' }}>{icon}</span>
                <div>
                  <Typography.Text strong style={{ display: 'block' }}>
                    {t(`aiStudio.actions.${key}.title`)}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {t(`aiStudio.actions.${key}.description`)}
                  </Typography.Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer
        title={action ? t(`aiStudio.actions.${action}.title`) : ''}
        open={!!action}
        onClose={closeDrawer}
        width={720}
        destroyOnHidden
      >
        <Form form={paramsForm} layout="vertical">
          <Form.Item name="topic" label={t('aiStudio.params.topic')} rules={[{ required: true }]}>
            <Input placeholder={t('aiStudio.params.topicPlaceholder')} />
          </Form.Item>
          {action === 'lesson' && (
            <Form.Item name="lessonTitle" label={t('aiStudio.params.lessonTitle')}>
              <Input placeholder={t('aiStudio.params.lessonTitlePlaceholder')} />
            </Form.Item>
          )}
          {action !== 'campaign' && (
            <Form.Item name="audienceHint" label={t('aiStudio.params.audience')}>
              <Input placeholder={t('aiStudio.params.audiencePlaceholder')} />
            </Form.Item>
          )}
          {action === 'campaign' && (
            <Form.Item name="courseTitle" label={t('aiStudio.params.courseTitle')}>
              <Input placeholder={t('aiStudio.params.courseTitlePlaceholder')} />
            </Form.Item>
          )}
          {action === 'course' && (
            <Space size="large" wrap>
              <Form.Item name="level" label={t('aiStudio.params.level')}>
                <Select allowClear style={{ width: 180 }} options={LEVEL_OPTIONS} />
              </Form.Item>
              <Form.Item name="durationHours" label={t('aiStudio.params.durationHours')}>
                <InputNumber min={1} max={100} />
              </Form.Item>
              <Form.Item name="moduleCount" label={t('aiStudio.params.moduleCount')} initialValue={3}>
                <InputNumber min={1} max={6} />
              </Form.Item>
            </Space>
          )}
          {action === 'course' && (
            <Form.Item name="goals" label={t('aiStudio.params.goals')}>
              <Input.TextArea rows={2} placeholder={t('aiStudio.params.goalsPlaceholder')} />
            </Form.Item>
          )}
          {action === 'lesson' && (
            <Form.Item name="durationMinutes" label={t('aiStudio.params.durationMinutes')}>
              <InputNumber min={5} max={240} />
            </Form.Item>
          )}
          {action === 'quiz' && (
            <Space size="large" wrap>
              <Form.Item name="questionCount" label={t('aiStudio.params.questionCount')} initialValue={5}>
                <InputNumber min={1} max={10} />
              </Form.Item>
              <Form.Item name="difficulty" label={t('aiStudio.params.difficulty')}>
                <Select allowClear style={{ width: 180 }} options={LEVEL_OPTIONS} />
              </Form.Item>
              <Form.Item name="questionTypes" label={t('aiStudio.params.questionTypes')}>
                <Select
                  mode="multiple"
                  allowClear
                  style={{ minWidth: 260 }}
                  options={QUESTION_TYPE_OPTIONS}
                />
              </Form.Item>
            </Space>
          )}
          <Form.Item name="materialAttachmentId" label={t('aiStudio.params.material')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('aiStudio.params.materialPlaceholder')}
              options={materialOptions}
            />
          </Form.Item>
          <Space>
            <Button type="primary" icon={<RobotOutlined />} loading={generating} onClick={handleGenerate}>
              {hasDraft ? t('aiStudio.regenerate') : t('aiStudio.generate')}
            </Button>
            {hasDraft && (
              <Button icon={<ReloadOutlined />} onClick={resetDrafts}>
                {t('aiStudio.clear')}
              </Button>
            )}
          </Space>
        </Form>

        {sourceLimitation && (
          <Alert type="warning" showIcon message={sourceLimitation} style={{ marginTop: 16 }} />
        )}

        {courseDraft && (
          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>{t('aiStudio.previewTitle')}</Typography.Title>
            <Form layout="vertical">
              <Form.Item label={t('aiStudio.course.titleLabel')}>
                <Input
                  value={courseDraft.title}
                  onChange={(e) => setCourseDraft({ ...courseDraft, title: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={t('aiStudio.course.descriptionLabel')}>
                <Input.TextArea
                  rows={3}
                  value={courseDraft.description}
                  onChange={(e) => setCourseDraft({ ...courseDraft, description: e.target.value })}
                />
              </Form.Item>
            </Form>
            {!!courseDraft.goals?.length && (
              <Typography.Paragraph>
                <Typography.Text strong>{t('aiStudio.course.goalsLabel')}:</Typography.Text>{' '}
                {courseDraft.goals.join('; ')}
              </Typography.Paragraph>
            )}
            <Collapse
              items={courseDraft.modules.map((module, moduleIndex) => ({
                key: String(moduleIndex),
                label: `${module.order}. ${module.title}`,
                children: module.lessons.map((lesson, lessonIndex) => (
                  <div key={lessonIndex} style={{ marginBottom: 12 }}>
                    <Input
                      value={lesson.title}
                      style={{ marginBottom: 4 }}
                      onChange={(e) => {
                        const next = structuredClone(courseDraft);
                        next.modules[moduleIndex].lessons[lessonIndex].title = e.target.value;
                        setCourseDraft(next);
                      }}
                    />
                    <Input.TextArea
                      rows={4}
                      value={lesson.content}
                      onChange={(e) => {
                        const next = structuredClone(courseDraft);
                        next.modules[moduleIndex].lessons[lessonIndex].content = e.target.value;
                        setCourseDraft(next);
                      }}
                    />
                  </div>
                )),
              }))}
            />
            {courseDraft.recommendedTest && (
              <Typography.Paragraph style={{ marginTop: 12 }}>
                <Tag color="blue">{t('aiStudio.course.recommendedTest')}</Tag>{' '}
                {courseDraft.recommendedTest.title} ({courseDraft.recommendedTest.questionCount}{' '}
                {t('aiStudio.course.questionsShort')})
              </Typography.Paragraph>
            )}
            {!!courseDraft.recommendedCases?.length && (
              <Typography.Paragraph>
                <Tag color="purple">{t('aiStudio.course.recommendedCases')}</Tag>{' '}
                {courseDraft.recommendedCases.join('; ')}
              </Typography.Paragraph>
            )}
            <Space style={{ marginTop: 12 }}>
              <Button type="primary" loading={saving} onClick={handleSaveCourse}>
                {t('aiStudio.course.saveButton')}
              </Button>
              <Button onClick={closeDrawer}>{t('common.cancel')}</Button>
            </Space>
          </div>
        )}

        {(lessonDraft || caseDraft || memoDraft) && (
          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>{t('aiStudio.previewTitle')}</Typography.Title>
            {lessonDraft?.goal && (
              <Typography.Paragraph type="secondary">
                {t('aiStudio.lesson.goalLabel')}: {lessonDraft.goal}
              </Typography.Paragraph>
            )}
            <Input.TextArea
              rows={14}
              value={editableMarkdown}
              onChange={(e) => setEditableMarkdown(e.target.value)}
            />
            <Form form={saveForm} layout="vertical" style={{ marginTop: 12 }}>
              <Space size="large" wrap>
                <Form.Item name="courseId" label={t('aiStudio.save.courseLabel')} rules={[{ required: true }]}>
                  <Select
                    style={{ minWidth: 280 }}
                    showSearch
                    optionFilterProp="label"
                    options={courseOptions}
                    onChange={(courseId) => {
                      saveForm.setFieldValue('moduleId', undefined);
                      void loadTargetCourse(courseId);
                    }}
                  />
                </Form.Item>
                <Form.Item name="moduleId" label={t('aiStudio.save.moduleLabel')} rules={[{ required: true }]}>
                  <Select
                    style={{ minWidth: 240 }}
                    options={targetCourse?.modules.map((m) => ({
                      value: m.id,
                      label: `${m.order}. ${m.title}`,
                    }))}
                  />
                </Form.Item>
              </Space>
            </Form>
            <Space>
              <Button
                type="primary"
                loading={saving}
                onClick={() =>
                  handleSaveLessonLike(
                    caseDraft ? 'CASE_STUDY' : memoDraft ? 'MEMO' : 'ARTICLE',
                    caseDraft?.title ??
                      memoDraft?.title ??
                      paramsForm.getFieldValue('lessonTitle') ??
                      paramsForm.getFieldValue('topic'),
                  )
                }
              >
                {t('aiStudio.save.addLessonButton')}
              </Button>
              <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(editableMarkdown)}>
                {t('aiStudio.copy')}
              </Button>
              <Button onClick={closeDrawer}>{t('common.cancel')}</Button>
            </Space>
          </div>
        )}

        {quizDraft && (
          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>{t('aiStudio.previewTitle')}</Typography.Title>
            {quizDraft.suggestedPassingScore != null && (
              <Typography.Paragraph type="secondary">
                {t('aiStudio.quiz.passingScoreLabel')}: {quizDraft.suggestedPassingScore}%
              </Typography.Paragraph>
            )}
            {quizDraft.questions.map((question, questionIndex) => (
              <Card key={questionIndex} size="small" style={{ marginBottom: 8 }}>
                <Input.TextArea
                  autoSize
                  value={question.text}
                  style={{ marginBottom: 8 }}
                  onChange={(e) => {
                    const next = structuredClone(quizDraft);
                    next.questions[questionIndex].text = e.target.value;
                    setQuizDraft(next);
                  }}
                />
                {question.options?.map((option, optionIndex) => (
                  <div key={optionIndex}>
                    <Typography.Text type={option.isCorrect ? 'success' : undefined}>
                      {option.isCorrect ? '✓' : '○'} {option.text}
                    </Typography.Text>
                  </div>
                ))}
                {question.explanation && (
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    {t('aiStudio.quiz.explanationLabel')}: {question.explanation}
                  </Typography.Paragraph>
                )}
              </Card>
            ))}
            <Form form={saveForm} layout="vertical" style={{ marginTop: 12 }}>
              <Form.Item name="courseId" label={t('aiStudio.save.courseLabel')} rules={[{ required: true }]}>
                <Select
                  style={{ maxWidth: 360 }}
                  showSearch
                  optionFilterProp="label"
                  options={courseOptions}
                />
              </Form.Item>
            </Form>
            <Space>
              <Button type="primary" loading={saving} onClick={handleSaveQuiz}>
                {t('aiStudio.quiz.saveButton')}
              </Button>
              <Button onClick={closeDrawer}>{t('common.cancel')}</Button>
            </Space>
          </div>
        )}

        {campaignDraft && (
          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>{t('aiStudio.previewTitle')}</Typography.Title>
            <Form layout="vertical">
              <Form.Item label={t('aiStudio.campaign.subjectLabel')}>
                <Input
                  value={campaignDraft.subject}
                  onChange={(e) => setCampaignDraft({ ...campaignDraft, subject: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={t('aiStudio.campaign.bodyLabel')}>
                <Input.TextArea
                  rows={5}
                  value={campaignDraft.body}
                  onChange={(e) => setCampaignDraft({ ...campaignDraft, body: e.target.value })}
                />
              </Form.Item>
            </Form>
            <Typography.Paragraph>
              <Typography.Text strong>{t('aiStudio.campaign.keyPointsLabel')}:</Typography.Text>
            </Typography.Paragraph>
            <ul>
              {campaignDraft.keyPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
            {!!campaignDraft.surveyQuestions.length && (
              <>
                <Typography.Paragraph>
                  <Typography.Text strong>{t('aiStudio.campaign.surveyLabel')}:</Typography.Text>
                </Typography.Paragraph>
                <ul>
                  {campaignDraft.surveyQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </>
            )}
            <Space>
              <Button type="primary" loading={saving} onClick={handleCreateCampaign}>
                {t('aiStudio.campaign.saveButton')}
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() =>
                  copyToClipboard(
                    `${campaignDraft.subject}\n\n${campaignDraft.body}\n\n${campaignDraft.keyPoints.map((p) => `— ${p}`).join('\n')}`,
                  )
                }
              >
                {t('aiStudio.copy')}
              </Button>
              <Button onClick={closeDrawer}>{t('common.cancel')}</Button>
            </Space>
          </div>
        )}

        {disclaimer && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            {disclaimer}
          </Typography.Paragraph>
        )}
      </Drawer>
    </div>
  );
}
