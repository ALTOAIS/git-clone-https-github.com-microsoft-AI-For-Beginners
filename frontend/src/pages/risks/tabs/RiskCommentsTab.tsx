import { Button, Input, List, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { commentsApi } from '../../../api/endpoints';
import type { RiskDetail } from '../../../types';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
}

export function RiskCommentsTab({ risk, onUpdated }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await commentsApi.create(risk.id, text.trim());
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
        placeholder={t('riskComments.placeholder')}
        style={{ marginBottom: 8 }}
      />
      <Button type="primary" onClick={handlePost} loading={posting} disabled={!text.trim()}>
        {t('riskComments.postButton')}
      </Button>

      <List
        style={{ marginTop: 24 }}
        itemLayout="vertical"
        dataSource={risk.comments}
        locale={{ emptyText: t('riskComments.noCommentsYet') }}
        renderItem={(comment) => (
          <List.Item>
            <List.Item.Meta
              title={comment.author?.fullName ?? t('riskComments.unknownUser')}
              description={dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
            />
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
              {comment.text}
            </Typography.Paragraph>
          </List.Item>
        )}
      />
    </div>
  );
}
