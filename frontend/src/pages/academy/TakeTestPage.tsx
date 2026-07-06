import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Checkbox, Form, Input, Radio, Result, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import type { TestAttempt, TestAttemptStage, TestQuestion } from '../../types';
import { ALL_TEST_ATTEMPT_STAGES, testAttemptStageLabel } from '../../utils/academyDisplay';

export function TakeTestPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const {
    data: test,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['test-for-attempt', courseId],
    queryFn: () => academyApi.getTestForAttempt(courseId!).then((r) => r.data),
    enabled: !!courseId,
    retry: false,
  });

  const { data: myAttempts } = useQuery({
    queryKey: ['my-test-attempts', courseId],
    queryFn: () => academyApi.myAttempts(courseId!).then((r) => r.data),
    enabled: !!courseId,
  });

  const takenStages = new Set((myAttempts ?? []).map((a) => a.stage));
  const availableStages = ALL_TEST_ATTEMPT_STAGES.filter((s) => !takenStages.has(s));
  const [lastResult, setLastResultState] = useState<TestAttempt | null>(null);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { stage, ...answers } = values as { stage: TestAttemptStage } & Record<string, unknown>;
    const { data } = await academyApi.submitAttempt(courseId!, { stage, answers });
    message.success(t('takeTest.submitted'));
    setLastResultState(data);
    queryClient.invalidateQueries({ queryKey: ['my-test-attempts', courseId] });
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (isError || !test) {
    return (
      <Result
        status="info"
        title={t('takeTest.noTestTitle')}
        subTitle={t('takeTest.noTestDescription')}
        extra={<Button onClick={() => navigate('/academy/my')}>{t('takeTest.backButton')}</Button>}
      />
    );
  }

  if (lastResult) {
    return (
      <Result
        status={lastResult.passed ? 'success' : 'warning'}
        title={t('takeTest.resultTitle', { percent: lastResult.scorePercent })}
        subTitle={lastResult.passed ? t('takeTest.resultPassed') : t('takeTest.resultFailed')}
        extra={
          <Space>
            <Button onClick={() => setLastResultState(null)}>{t('takeTest.takeAnotherStage')}</Button>
            <Button type="primary" onClick={() => navigate('/academy/my')}>
              {t('takeTest.backButton')}
            </Button>
          </Space>
        }
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>{test.title}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {t('takeTest.passScoreInfo', { percent: test.passScorePercent })}
      </Typography.Paragraph>

      {myAttempts && myAttempts.length > 0 && (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={myAttempts}
          style={{ marginBottom: 24 }}
          columns={[
            { title: t('takeTest.columns.stage'), dataIndex: 'stage', render: (v: TestAttemptStage) => testAttemptStageLabel(v) },
            { title: t('takeTest.columns.score'), dataIndex: 'scorePercent', render: (v: number) => `${v}%` },
            {
              title: t('takeTest.columns.passed'),
              dataIndex: 'passed',
              render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? t('takeTest.passedYes') : t('takeTest.passedNo')}</Tag>,
            },
          ]}
        />
      )}

      {availableStages.length === 0 ? (
        <Result status="success" title={t('takeTest.allStagesTaken')} />
      ) : (
        <Card>
          <Form form={form} layout="vertical" initialValues={{ stage: availableStages[0] }}>
            <Form.Item name="stage" label={t('takeTest.stageLabel')} rules={[{ required: true }]}>
              <Select options={availableStages.map((s) => ({ value: s, label: testAttemptStageLabel(s) }))} />
            </Form.Item>

            {[...test.questions]
              .sort((a, b) => a.order - b.order)
              .map((q: TestQuestion, idx: number) => (
                <Form.Item
                  key={q.id}
                  name={q.id}
                  label={`${idx + 1}. ${q.text}`}
                  rules={[{ required: true, message: t('takeTest.answerRequired') }]}
                >
                  {q.type === 'MULTIPLE_CHOICE' ? (
                    <Checkbox.Group options={q.options.map((o) => ({ value: o.id, label: o.text }))} />
                  ) : q.type === 'SHORT_ANSWER' ? (
                    <Input />
                  ) : (
                    <Radio.Group options={q.options.map((o) => ({ value: o.id, label: o.text }))} />
                  )}
                </Form.Item>
              ))}

            <Button type="primary" onClick={handleSubmit}>
              {t('takeTest.submitButton')}
            </Button>
          </Form>
        </Card>
      )}
    </div>
  );
}
