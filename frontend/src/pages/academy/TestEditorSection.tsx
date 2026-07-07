import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Checkbox, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import type { AiQuizQuestionDraft, TestAttempt, TestDetail, TestQuestion } from '../../types';
import {
  ALL_TEST_QUESTION_TYPES,
  testAttemptStageLabel,
  testQuestionTypeLabel,
} from '../../utils/academyDisplay';

export interface TestEditorAdapter {
  queryKey: string;
  topicHint: string;
  getTest: () => Promise<TestDetail>;
  getAttempts: () => Promise<TestAttempt[]>;
  createTest: (data: Record<string, unknown>) => Promise<unknown>;
  updateTest: (data: Record<string, unknown>) => Promise<unknown>;
  removeTest: () => Promise<unknown>;
  addQuestion: (data: Record<string, unknown>) => Promise<unknown>;
  updateQuestion: (questionId: string, data: Record<string, unknown>) => Promise<unknown>;
  removeQuestion: (questionId: string) => Promise<unknown>;
  generateQuestions: (questionCount: number) => Promise<AiQuizQuestionDraft[]>;
}

export function courseTestAdapter(courseId: string, topicHint: string): TestEditorAdapter {
  return {
    queryKey: `course-test-${courseId}`,
    topicHint,
    getTest: () => academyApi.getTest(courseId).then((r) => r.data),
    getAttempts: () => academyApi.allAttempts(courseId).then((r) => r.data),
    createTest: (data) => academyApi.createTest(courseId, data),
    updateTest: (data) => academyApi.updateTest(courseId, data),
    removeTest: () => academyApi.removeTest(courseId),
    addQuestion: (data) => academyApi.addQuestion(courseId, data),
    updateQuestion: (questionId, data) => academyApi.updateQuestion(courseId, questionId, data),
    removeQuestion: (questionId) => academyApi.removeQuestion(courseId, questionId),
    generateQuestions: (questionCount) =>
      aiApi.generateQuizQuestions({ courseId, topic: topicHint, questionCount }).then((r) => r.data.questions),
  };
}

export function lessonQuizAdapter(courseId: string, lessonId: string, topicHint: string): TestEditorAdapter {
  return {
    queryKey: `lesson-quiz-${courseId}-${lessonId}`,
    topicHint,
    getTest: () => academyApi.getLessonQuiz(courseId, lessonId).then((r) => r.data),
    getAttempts: () => academyApi.allQuizAttempts(courseId, lessonId).then((r) => r.data),
    createTest: (data) => academyApi.createLessonQuiz(courseId, lessonId, data),
    updateTest: (data) => academyApi.updateLessonQuiz(courseId, lessonId, data),
    removeTest: () => academyApi.removeLessonQuiz(courseId, lessonId),
    addQuestion: (data) => academyApi.addQuizQuestion(courseId, lessonId, data),
    updateQuestion: (questionId, data) => academyApi.updateQuizQuestion(courseId, lessonId, questionId, data),
    removeQuestion: (questionId) => academyApi.removeQuizQuestion(courseId, lessonId, questionId),
    generateQuestions: (questionCount) =>
      aiApi.generateQuizQuestions({ courseId, topic: topicHint, questionCount }).then((r) => r.data.questions),
  };
}

interface Props {
  adapter: TestEditorAdapter;
}

export function TestEditorSection({ adapter }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testForm] = Form.useForm();
  const [questionModal, setQuestionModal] = useState<{ editing: TestQuestion | null } | null>(null);
  const [questionForm] = Form.useForm();
  const [aiQuestionCount, setAiQuestionCount] = useState(3);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiDraftQuestions, setAiDraftQuestions] = useState<AiQuizQuestionDraft[]>([]);
  const [addedQuestionIndexes, setAddedQuestionIndexes] = useState<number[]>([]);

  const { data: test, isLoading, isError } = useQuery({
    queryKey: [adapter.queryKey],
    queryFn: adapter.getTest,
    retry: false,
  });

  const { data: attempts } = useQuery({
    queryKey: [adapter.queryKey, 'attempts'],
    queryFn: adapter.getAttempts,
    enabled: !!test,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [adapter.queryKey] });
    queryClient.invalidateQueries({ queryKey: [adapter.queryKey, 'attempts'] });
  };

  const openCreateTest = () => {
    testForm.resetFields();
    testForm.setFieldsValue({ passScorePercent: 70 });
    setTestModalOpen(true);
  };

  const openEditTest = () => {
    if (!test) return;
    testForm.setFieldsValue({ title: test.title, passScorePercent: test.passScorePercent });
    setTestModalOpen(true);
  };

  const handleSaveTest = async () => {
    const values = await testForm.validateFields();
    if (test) {
      await adapter.updateTest(values);
      message.success(t('courseEditor.test.updated'));
    } else {
      await adapter.createTest(values);
      message.success(t('courseEditor.test.created'));
    }
    setTestModalOpen(false);
    invalidate();
  };

  const handleDeleteTest = async () => {
    await adapter.removeTest();
    message.success(t('courseEditor.test.removed'));
    invalidate();
  };

  const openCreateQuestion = () => {
    questionForm.resetFields();
    questionForm.setFieldsValue({
      order: (test?.questions.length ?? 0) + 1,
      type: 'SINGLE_CHOICE',
      points: 1,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    });
    setQuestionModal({ editing: null });
  };

  const openEditQuestion = (question: TestQuestion) => {
    questionForm.setFieldsValue({
      order: question.order,
      type: question.type,
      text: question.text,
      points: question.points,
      correctAnswerText: question.correctAnswerText ?? undefined,
      options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
    });
    setQuestionModal({ editing: question });
  };

  const handleTypeChange = (type: string) => {
    if (type === 'TRUE_FALSE') {
      questionForm.setFieldsValue({
        options: [
          { text: t('courseEditor.test.trueLabel'), isCorrect: true },
          { text: t('courseEditor.test.falseLabel'), isCorrect: false },
        ],
      });
    }
  };

  const handleSaveQuestion = async () => {
    const values = await questionForm.validateFields();
    const payload = {
      order: values.order,
      type: values.type,
      text: values.text,
      points: values.points,
      correctAnswerText: values.type === 'SHORT_ANSWER' ? values.correctAnswerText : undefined,
      options:
        values.type !== 'SHORT_ANSWER'
          ? (values.options ?? []).map((o: { text: string; isCorrect?: boolean }, idx: number) => ({
              order: idx + 1,
              text: o.text,
              isCorrect: !!o.isCorrect,
            }))
          : undefined,
    };
    if (questionModal?.editing) {
      await adapter.updateQuestion(questionModal.editing.id, payload);
      message.success(t('courseEditor.test.questionUpdated'));
    } else {
      await adapter.addQuestion(payload);
      message.success(t('courseEditor.test.questionAdded'));
    }
    setQuestionModal(null);
    invalidate();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    await adapter.removeQuestion(questionId);
    message.success(t('courseEditor.test.questionRemoved'));
    invalidate();
  };

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const questions = await adapter.generateQuestions(aiQuestionCount);
      setAiDraftQuestions(questions);
      setAddedQuestionIndexes([]);
      setAiDrawerOpen(true);
    } catch {
      message.error(t('courseEditor.test.aiGenerateFailed'));
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleAddDraftQuestion = async (draft: AiQuizQuestionDraft, index: number) => {
    await adapter.addQuestion({
      order: (test?.questions.length ?? 0) + index + 1,
      type: draft.type,
      text: draft.text,
      points: draft.points,
      correctAnswerText: draft.correctAnswerText,
      options: draft.options,
    });
    setAddedQuestionIndexes((prev) => [...prev, index]);
    message.success(t('courseEditor.test.questionAdded'));
    invalidate();
  };

  const watchedType = Form.useWatch('type', questionForm);

  if (isLoading) return null;

  if (isError || !test) {
    return (
      <Card
        title={
          <span>
            {t('courseEditor.test.cardTitle')}
            <InfoTooltip text={t('tooltips.academy.test')} />
          </span>
        }
        style={{ marginTop: 24 }}
      >
        <Typography.Paragraph type="secondary">{t('courseEditor.test.noTestYet')}</Typography.Paragraph>
        <Button icon={<PlusOutlined />} onClick={openCreateTest}>
          {t('courseEditor.test.createButton')}
        </Button>
        <Modal
          title={t('courseEditor.test.createModalTitle')}
          open={testModalOpen}
          onCancel={() => setTestModalOpen(false)}
          onOk={handleSaveTest}
          destroyOnHidden
        >
          <Form form={testForm} layout="vertical">
            <Form.Item name="title" label={t('courseEditor.test.titleLabel')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="passScorePercent" label={t('courseEditor.test.passScoreLabel')}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  }

  return (
    <Card
      title={
        <span>
          {t('courseEditor.test.cardTitle')}
          <InfoTooltip text={t('tooltips.academy.test')} />
        </span>
      }
      style={{ marginTop: 24 }}
      extra={
        <Space>
          <a onClick={openEditTest}>{t('courseEditor.editLink')}</a>
          <Popconfirm title={t('courseEditor.test.deleteConfirm')} onConfirm={handleDeleteTest}>
            <a>{t('courseEditor.deleteLink')}</a>
          </Popconfirm>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text strong>{test.title}</Typography.Text>
        <Typography.Text type="secondary">
          {t('courseEditor.test.passScoreDisplay', { percent: test.passScorePercent })}
        </Typography.Text>
      </Space>

      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {t('courseEditor.test.questionsTitle')}
        </Typography.Title>
        <Space>
          <InputNumber min={1} max={10} value={aiQuestionCount} onChange={(v) => setAiQuestionCount(v ?? 3)} />
          <Button loading={generatingQuestions} onClick={handleGenerateQuestions}>
            {t('courseEditor.test.aiGenerateQuestionsButton')}
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={openCreateQuestion}>
            {t('courseEditor.test.addQuestionButton')}
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={[...test.questions].sort((a, b) => a.order - b.order)}
        locale={{ emptyText: t('courseEditor.test.noQuestionsYet') }}
        columns={[
          { title: t('courseEditor.lessonColumns.order'), dataIndex: 'order', width: 60 },
          { title: t('courseEditor.lessonColumns.title'), dataIndex: 'text' },
          {
            title: t('courseEditor.test.typeColumn'),
            dataIndex: 'type',
            width: 180,
            render: (v: TestQuestion['type']) => <Tag>{testQuestionTypeLabel(v)}</Tag>,
          },
          { title: t('courseEditor.test.pointsColumn'), dataIndex: 'points', width: 90 },
          {
            title: t('courseEditor.lessonColumns.actions'),
            width: 120,
            render: (_: unknown, question: TestQuestion) => (
              <Space>
                <a onClick={() => openEditQuestion(question)}>{t('courseEditor.editLink')}</a>
                <Popconfirm title={t('courseEditor.test.deleteQuestionConfirm')} onConfirm={() => handleDeleteQuestion(question.id)}>
                  <a>{t('courseEditor.deleteLink')}</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {attempts && attempts.length > 0 && (
        <>
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('courseEditor.test.attemptsTitle')}
          </Typography.Title>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={attempts}
            columns={[
              { title: t('courseEditor.test.attemptColumns.user'), dataIndex: ['user', 'fullName'] },
              {
                title: t('courseEditor.test.attemptColumns.stage'),
                dataIndex: 'stage',
                render: (v: TestAttempt['stage']) => (v ? testAttemptStageLabel(v) : '—'),
              },
              { title: t('courseEditor.test.attemptColumns.score'), dataIndex: 'scorePercent', render: (v: number) => `${v}%` },
              {
                title: t('courseEditor.test.attemptColumns.passed'),
                dataIndex: 'passed',
                render: (v: boolean) => (
                  <Tag color={v ? 'green' : 'red'}>
                    {v ? t('courseEditor.test.passedYes') : t('courseEditor.test.passedNo')}
                  </Tag>
                ),
              },
              {
                title: t('courseEditor.test.attemptColumns.submittedAt'),
                dataIndex: 'submittedAt',
                render: (v: string) => v.slice(0, 10),
              },
            ]}
          />
        </>
      )}

      <Modal
        title={test ? t('courseEditor.test.editModalTitle') : t('courseEditor.test.createModalTitle')}
        open={testModalOpen}
        onCancel={() => setTestModalOpen(false)}
        onOk={handleSaveTest}
        destroyOnHidden
      >
        <Form form={testForm} layout="vertical">
          <Form.Item name="title" label={t('courseEditor.test.titleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="passScorePercent" label={t('courseEditor.test.passScoreLabel')}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={questionModal?.editing ? t('courseEditor.test.questionModalTitleEdit') : t('courseEditor.test.questionModalTitleAdd')}
        open={!!questionModal}
        onCancel={() => setQuestionModal(null)}
        onOk={handleSaveQuestion}
        width={680}
        destroyOnHidden
      >
        <Form form={questionForm} layout="vertical">
          <Form.Item name="order" label={t('courseEditor.form.orderLabel')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label={t('courseEditor.test.typeColumn')} rules={[{ required: true }]}>
            <Select
              options={ALL_TEST_QUESTION_TYPES.map((value) => ({ value, label: testQuestionTypeLabel(value) }))}
              onChange={handleTypeChange}
            />
          </Form.Item>
          <Form.Item name="text" label={t('courseEditor.test.questionTextLabel')} rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="points" label={t('courseEditor.test.pointsColumn')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          {watchedType === 'SHORT_ANSWER' && (
            <Form.Item
              name="correctAnswerText"
              label={
                <span>
                  {t('courseEditor.test.correctAnswerLabel')}
                  <InfoTooltip text={t('tooltips.academy.correctAnswerText')} />
                </span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          )}

          {watchedType !== 'SHORT_ANSWER' && (
            <Form.Item label={t('courseEditor.test.optionsLabel')}>
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8, width: '100%' }}>
                        <Form.Item
                          name={[field.name, 'text']}
                          rules={[{ required: true, message: t('courseEditor.test.optionTextRequired') }]}
                          style={{ flex: 1, marginBottom: 0 }}
                        >
                          <Input placeholder={t('courseEditor.test.optionTextPlaceholder')} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'isCorrect']} valuePropName="checked" style={{ marginBottom: 0 }}>
                          <Checkbox>{t('courseEditor.test.correctLabel')}</Checkbox>
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ isCorrect: false })}>
                      {t('courseEditor.test.addOptionButton')}
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Drawer
        title={t('courseEditor.test.aiDrawerTitle')}
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        width={560}
        destroyOnHidden
      >
        {aiDraftQuestions.length === 0 ? (
          <Typography.Text type="secondary">{t('courseEditor.test.aiNoSuggestions')}</Typography.Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {aiDraftQuestions.map((question, index) => (
              <Card key={index} size="small" title={question.text}>
                {question.options && (
                  <ul>
                    {question.options.map((option, optionIndex) => (
                      <li key={optionIndex}>
                        {option.text} {option.isCorrect && <Tag color="green">{t('courseEditor.test.correctLabel')}</Tag>}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="primary"
                  size="small"
                  disabled={addedQuestionIndexes.includes(index)}
                  onClick={() => handleAddDraftQuestion(question, index)}
                >
                  {addedQuestionIndexes.includes(index) ? t('courseEditor.test.aiAdded') : t('courseEditor.test.aiAddQuestion')}
                </Button>
              </Card>
            ))}
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
