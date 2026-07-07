import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Checkbox, Form, Input, Radio, Result, Skeleton, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi } from '../../api/endpoints';
import type { PlayerLesson, TestAttempt, TestQuestion } from '../../types';

interface Props {
  courseId: string;
  lesson: PlayerLesson;
  onSubmitted?: () => void;
}

export function LessonQuizPlayer({ courseId, lesson, onSubmitted }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [lastResult, setLastResult] = useState<TestAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const quizQueryKey = ['lesson-quiz-for-attempt', courseId, lesson.id];
  const {
    data: quiz,
    isLoading,
    isError,
  } = useQuery({
    queryKey: quizQueryKey,
    queryFn: () => academyApi.getLessonQuizForAttempt(courseId, lesson.id).then((r) => r.data),
    retry: false,
  });

  const attemptsQueryKey = ['my-lesson-quiz-attempts', courseId, lesson.id];
  const { data: myAttempts } = useQuery({
    queryKey: attemptsQueryKey,
    queryFn: () => academyApi.myQuizAttempts(courseId, lesson.id).then((r) => r.data),
    enabled: !!quiz,
  });

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isError || !quiz) {
    return <Typography.Text type="secondary">{t('lessonQuiz.noQuiz')}</Typography.Text>;
  }

  const passedAttempt = lastResult?.passed ? lastResult : myAttempts?.find((a) => a.passed);

  if (passedAttempt) {
    return (
      <Result
        status="success"
        title={t('lessonQuiz.passedTitle', { percent: passedAttempt.scorePercent })}
        subTitle={t('lessonQuiz.passedDescription')}
      />
    );
  }

  if (lastResult && !lastResult.passed) {
    return (
      <Result
        status="warning"
        title={t('lessonQuiz.failedTitle', { percent: lastResult.scorePercent })}
        subTitle={t('lessonQuiz.failedDescription', { percent: quiz.passScorePercent })}
        extra={
          <Button type="primary" onClick={() => setLastResult(null)}>
            {t('lessonQuiz.retryButton')}
          </Button>
        }
      />
    );
  }

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const { data } = await academyApi.submitQuizAttempt(courseId, lesson.id, { answers: values });
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: attemptsQueryKey });
      message[data.passed ? 'success' : 'warning'](
        data.passed ? t('lessonQuiz.submitSuccess') : t('lessonQuiz.submitFailed'),
      );
      onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Typography.Title level={5}>{quiz.title}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {t('lessonQuiz.passScoreInfo', { percent: quiz.passScorePercent })}
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        {[...quiz.questions]
          .sort((a, b) => a.order - b.order)
          .map((q: TestQuestion, idx: number) => (
            <Form.Item
              key={q.id}
              name={q.id}
              label={`${idx + 1}. ${q.text}`}
              rules={[{ required: true, message: t('lessonQuiz.answerRequired') }]}
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
        <Button type="primary" loading={submitting} onClick={handleSubmit}>
          {t('lessonQuiz.submitButton')}
        </Button>
      </Form>
    </Card>
  );
}
