import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Checkbox, Form, Input, Radio, Rate, Result, Skeleton, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { surveysApi } from '../../api/endpoints';
import type { SurveyQuestion } from '../../types';

export function RespondSurveyPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: myResponse, isLoading: isLoadingMyResponse } = useQuery({
    queryKey: ['my-survey-response', id],
    queryFn: () => surveysApi.myResponse(id!).then((r) => r.data),
    enabled: !!id,
  });

  const handleSubmit = async () => {
    const answers = await form.validateFields();
    await surveysApi.submitResponse(id!, { answers });
    message.success(t('respondSurvey.submitted'));
    setSubmitted(true);
    queryClient.invalidateQueries({ queryKey: ['my-survey-response', id] });
  };

  if (isLoading || isLoadingMyResponse) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (!survey) {
    return (
      <Result
        status="info"
        title={t('respondSurvey.notFoundTitle')}
        extra={<Button onClick={() => navigate('/academy/surveys')}>{t('respondSurvey.backButton')}</Button>}
      />
    );
  }

  if (submitted || myResponse) {
    return (
      <Result
        status="success"
        title={t('respondSurvey.alreadyRespondedTitle')}
        subTitle={t('respondSurvey.thankYou')}
        extra={
          <Button type="primary" onClick={() => navigate('/academy/surveys')}>
            {t('respondSurvey.backButton')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>{survey.title}</Typography.Title>
      {survey.description && <Typography.Paragraph type="secondary">{survey.description}</Typography.Paragraph>}
      {survey.isAnonymous && <Typography.Paragraph type="secondary">{t('respondSurvey.anonymousNotice')}</Typography.Paragraph>}

      <Card>
        <Form form={form} layout="vertical">
          {[...survey.questions]
            .sort((a, b) => a.order - b.order)
            .map((q: SurveyQuestion, idx: number) => (
              <Form.Item
                key={q.id}
                name={q.id}
                label={`${idx + 1}. ${q.text}`}
                rules={[{ required: true, message: t('respondSurvey.answerRequired') }]}
              >
                {q.type === 'MULTIPLE_CHOICE' ? (
                  <Checkbox.Group options={q.options.map((o) => ({ value: o.id, label: o.text }))} />
                ) : q.type === 'SINGLE_CHOICE' ? (
                  <Radio.Group options={q.options.map((o) => ({ value: o.id, label: o.text }))} />
                ) : q.type === 'RATING' ? (
                  <Rate />
                ) : (
                  <Input.TextArea rows={3} />
                )}
              </Form.Item>
            ))}

          <Button type="primary" onClick={handleSubmit}>
            {t('respondSurvey.submitButton')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
