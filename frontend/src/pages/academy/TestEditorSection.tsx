import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import type { TestAttempt, TestQuestion } from '../../types';
import {
  ALL_TEST_QUESTION_TYPES,
  testAttemptStageLabel,
  testQuestionTypeLabel,
} from '../../utils/academyDisplay';

interface Props {
  courseId: string;
}

export function TestEditorSection({ courseId }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testForm] = Form.useForm();
  const [questionModal, setQuestionModal] = useState<{ editing: TestQuestion | null } | null>(null);
  const [questionForm] = Form.useForm();

  const { data: test, isLoading, isError } = useQuery({
    queryKey: ['course-test', courseId],
    queryFn: () => academyApi.getTest(courseId).then((r) => r.data),
    retry: false,
  });

  const { data: attempts } = useQuery({
    queryKey: ['course-test-attempts', courseId],
    queryFn: () => academyApi.allAttempts(courseId).then((r) => r.data),
    enabled: !!test,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['course-test', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course-test-attempts', courseId] });
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
      await academyApi.updateTest(courseId, values);
      message.success(t('courseEditor.test.updated'));
    } else {
      await academyApi.createTest(courseId, values);
      message.success(t('courseEditor.test.created'));
    }
    setTestModalOpen(false);
    invalidate();
  };

  const handleDeleteTest = async () => {
    await academyApi.removeTest(courseId);
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
      await academyApi.updateQuestion(courseId, questionModal.editing.id, payload);
      message.success(t('courseEditor.test.questionUpdated'));
    } else {
      await academyApi.addQuestion(courseId, payload);
      message.success(t('courseEditor.test.questionAdded'));
    }
    setQuestionModal(null);
    invalidate();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    await academyApi.removeQuestion(courseId, questionId);
    message.success(t('courseEditor.test.questionRemoved'));
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
        <Button size="small" icon={<PlusOutlined />} onClick={openCreateQuestion}>
          {t('courseEditor.test.addQuestionButton')}
        </Button>
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
                render: (v: TestAttempt['stage']) => testAttemptStageLabel(v),
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
    </Card>
  );
}
