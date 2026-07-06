import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { surveysApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { SurveyQuestion } from '../../types';
import { ALL_SURVEY_QUESTION_TYPES, ALL_SURVEY_STATUSES, surveyQuestionTypeLabel, surveyStatusLabel } from '../../utils/surveyDisplay';

export function SurveyEditorPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [metaForm] = Form.useForm();
  const [questionModal, setQuestionModal] = useState<{ editing: SurveyQuestion | null } | null>(null);
  const [questionForm] = Form.useForm();

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (survey) {
      metaForm.setFieldsValue({
        title: survey.title,
        description: survey.description,
        status: survey.status,
        isAnonymous: survey.isAnonymous,
      });
    }
  }, [survey, metaForm]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['survey', id] });

  const handleSaveMeta = async () => {
    const values = await metaForm.validateFields();
    await surveysApi.update(id!, values);
    message.success(t('surveyEditor.saved'));
    invalidate();
  };

  const openCreateQuestion = () => {
    questionForm.resetFields();
    questionForm.setFieldsValue({
      order: (survey?.questions.length ?? 0) + 1,
      type: 'SINGLE_CHOICE',
      options: [{ text: '' }, { text: '' }],
    });
    setQuestionModal({ editing: null });
  };

  const openEditQuestion = (question: SurveyQuestion) => {
    questionForm.setFieldsValue({
      order: question.order,
      type: question.type,
      text: question.text,
      options: question.options.map((o) => ({ text: o.text })),
    });
    setQuestionModal({ editing: question });
  };

  const handleSaveQuestion = async () => {
    const values = await questionForm.validateFields();
    const needsOptions = values.type === 'SINGLE_CHOICE' || values.type === 'MULTIPLE_CHOICE';
    const payload = {
      order: values.order,
      type: values.type,
      text: values.text,
      options: needsOptions
        ? (values.options ?? []).map((o: { text: string }, idx: number) => ({ order: idx + 1, text: o.text }))
        : undefined,
    };
    if (questionModal?.editing) {
      await surveysApi.updateQuestion(id!, questionModal.editing.id, payload);
      message.success(t('surveyEditor.questionUpdated'));
    } else {
      await surveysApi.addQuestion(id!, payload);
      message.success(t('surveyEditor.questionAdded'));
    }
    setQuestionModal(null);
    invalidate();
  };

  const handleDeleteQuestion = async (questionId: string) => {
    await surveysApi.removeQuestion(id!, questionId);
    message.success(t('surveyEditor.questionRemoved'));
    invalidate();
  };

  const watchedType = Form.useWatch('type', questionForm);
  const needsOptions = watchedType === 'SINGLE_CHOICE' || watchedType === 'MULTIPLE_CHOICE';

  if (isLoading || !survey) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('surveyEditor.title')}
          <InfoTooltip text={t('tooltips.academy.surveys')} />
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/academy/surveys')}>{t('surveyEditor.backButton')}</Button>
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>

      <Card title={t('surveyEditor.metaCardTitle')} style={{ marginTop: 16 }}>
        <Form form={metaForm} layout="vertical">
          <Form.Item
            name="title"
            label={t('surveyEditor.form.titleLabel')}
            rules={[{ required: true, message: t('surveyEditor.form.titleRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('surveyEditor.form.descriptionLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label={t('surveyEditor.form.statusLabel')}>
            <Select options={ALL_SURVEY_STATUSES.map((value) => ({ value, label: surveyStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item name="isAnonymous" label={t('surveyEditor.form.anonymousLabel')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" onClick={handleSaveMeta}>
            {t('surveyEditor.saveButton')}
          </Button>
        </Form>
      </Card>

      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('surveyEditor.questionsTitle')}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreateQuestion}>
          {t('surveyEditor.addQuestionButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        pagination={false}
        dataSource={[...survey.questions].sort((a, b) => a.order - b.order)}
        locale={{ emptyText: t('surveyEditor.noQuestionsYet') }}
        columns={[
          { title: t('courseEditor.lessonColumns.order'), dataIndex: 'order', width: 60 },
          { title: t('courseEditor.lessonColumns.title'), dataIndex: 'text' },
          {
            title: t('courseEditor.test.typeColumn'),
            dataIndex: 'type',
            width: 200,
            render: (v: SurveyQuestion['type']) => <Tag>{surveyQuestionTypeLabel(v)}</Tag>,
          },
          {
            title: t('courseEditor.lessonColumns.actions'),
            width: 120,
            render: (_: unknown, question: SurveyQuestion) => (
              <Space>
                <a onClick={() => openEditQuestion(question)}>{t('courseEditor.editLink')}</a>
                <Popconfirm title={t('surveyEditor.deleteQuestionConfirm')} onConfirm={() => handleDeleteQuestion(question.id)}>
                  <a>{t('courseEditor.deleteLink')}</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={questionModal?.editing ? t('surveyEditor.questionModalTitleEdit') : t('surveyEditor.questionModalTitleAdd')}
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
            <Select options={ALL_SURVEY_QUESTION_TYPES.map((value) => ({ value, label: surveyQuestionTypeLabel(value) }))} />
          </Form.Item>
          <Form.Item name="text" label={t('courseEditor.test.questionTextLabel')} rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>

          {needsOptions && (
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
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>
                      {t('courseEditor.test.addOptionButton')}
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
