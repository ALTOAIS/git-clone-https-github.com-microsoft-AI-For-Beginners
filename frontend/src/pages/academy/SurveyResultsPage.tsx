import { useQuery } from '@tanstack/react-query';
import { Button, Card, Empty, List, Progress, Rate, Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { surveysApi } from '../../api/endpoints';
import type { SurveyResultsQuestion } from '../../types';

export function SurveyResultsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['survey-results', id],
    queryFn: () => surveysApi.getResults(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading || !data) return <Skeleton active paragraph={{ rows: 10 }} />;

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('surveyResults.title', { title: data.survey.title })}
        </Typography.Title>
        <Button onClick={() => navigate('/academy/surveys')}>{t('surveyEditor.backButton')}</Button>
      </Space>
      <Typography.Paragraph type="secondary">
        {t('surveyResults.responseCount', { count: data.survey.responseCount })}
      </Typography.Paragraph>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {data.questions.map((q: SurveyResultsQuestion, idx: number) => (
          <Card key={q.id} title={`${idx + 1}. ${q.text}`}>
            {q.optionCounts && (
              <Space direction="vertical" style={{ width: '100%' }}>
                {q.optionCounts.map((o) => {
                  const max = Math.max(1, data.survey.responseCount);
                  return (
                    <div key={o.optionId}>
                      <Typography.Text>
                        {o.text} — {o.count}
                      </Typography.Text>
                      <Progress percent={Math.round((o.count / max) * 100)} showInfo={false} />
                    </div>
                  );
                })}
              </Space>
            )}

            {q.average !== undefined && q.distribution && (
              <Space direction="vertical">
                <Space>
                  <Rate disabled value={q.average} allowHalf />
                  <Typography.Text>{t('surveyResults.averageRating', { value: q.average })}</Typography.Text>
                </Space>
                {Object.entries(q.distribution).map(([star, count]) => (
                  <Typography.Text key={star} type="secondary">
                    {star} — {count}
                  </Typography.Text>
                ))}
              </Space>
            )}

            {q.textAnswers && (
              <List
                size="small"
                dataSource={q.textAnswers}
                locale={{ emptyText: <Empty description={t('surveyResults.noAnswers')} /> }}
                renderItem={(a) => (
                  <List.Item>
                    <Typography.Text>{a.answer}</Typography.Text>
                    {a.respondentName && <Typography.Text type="secondary"> — {a.respondentName}</Typography.Text>}
                  </List.Item>
                )}
              />
            )}
          </Card>
        ))}
      </Space>
    </div>
  );
}
