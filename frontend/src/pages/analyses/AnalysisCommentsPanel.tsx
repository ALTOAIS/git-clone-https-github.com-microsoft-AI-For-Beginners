import { Button, Input, List, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../api/endpoints';
import type { AnalysisDetail } from '../../types';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function AnalysisCommentsPanel({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

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
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{comment.text}</Typography.Paragraph>
          </List.Item>
        )}
      />
    </div>
  );
}
