import { useQuery } from '@tanstack/react-query';
import { Button, Input, List, Space, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisDetail, AnalysisHistoryEntry } from '../../../types';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage11CoordinationTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const { data: history } = useQuery({
    queryKey: ['analysis-history', analysis.id],
    queryFn: () => analysesApi.getHistory(analysis.id).then((r) => r.data as AnalysisHistoryEntry[]),
  });

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await analysesApi.addComment(analysis.id, text.trim());
      setText('');
      onUpdated();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <span style={{ color: '#8c8c8c', display: 'block', marginBottom: 16 }}>
        {t('analysisStage11.intro')}
        <InfoTooltip text={t('tooltips.analyses.coordination')} />
      </span>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={5}>{t('analysisStage11.commentsTitle')}</Typography.Title>
          <Input.TextArea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('analysisStage11.commentPlaceholder')}
            style={{ marginBottom: 8 }}
          />
          <Button type="primary" onClick={handlePost} loading={posting} disabled={!text.trim()}>
            {t('analysisStage11.postButton')}
          </Button>

          <List
            style={{ marginTop: 24 }}
            itemLayout="vertical"
            dataSource={analysis.comments}
            locale={{ emptyText: t('analysisStage11.noCommentsYet') }}
            renderItem={(comment) => (
              <List.Item>
                <List.Item.Meta
                  title={comment.author?.fullName ?? t('common.unknown')}
                  description={dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
                />
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {comment.text}
                </Typography.Paragraph>
              </List.Item>
            )}
          />
        </div>

        <div>
          <Typography.Title level={5}>
            {t('analysisStage11.historyTitle')}
            <InfoTooltip text={t('tooltips.analyses.history')} />
          </Typography.Title>
          {!history || history.length === 0 ? (
            <Typography.Text type="secondary">{t('analysisStage11.noHistoryYet')}</Typography.Text>
          ) : (
            <Timeline
              items={history.map((entry) => ({
                children: (
                  <div>
                    <Typography.Text strong>{t(`auditLog.actions.${entry.action}`, entry.action)}</Typography.Text>
                    <div style={{ color: '#888', fontSize: 12 }}>
                      {entry.user?.fullName ?? t('common.unknown')} · {dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </Space>
    </div>
  );
}
