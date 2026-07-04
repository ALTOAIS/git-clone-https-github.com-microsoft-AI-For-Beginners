import { Button, Input, List, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { commentsApi } from '../../../api/endpoints';
import type { RiskDetail } from '../../../types';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
}

export function RiskCommentsTab({ risk, onUpdated }: Props) {
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
        placeholder="Add a comment..."
        style={{ marginBottom: 8 }}
      />
      <Button type="primary" onClick={handlePost} loading={posting} disabled={!text.trim()}>
        Post Comment
      </Button>

      <List
        style={{ marginTop: 24 }}
        itemLayout="vertical"
        dataSource={risk.comments}
        locale={{ emptyText: 'No comments yet' }}
        renderItem={(comment) => (
          <List.Item>
            <List.Item.Meta
              title={comment.author?.fullName ?? 'Unknown user'}
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
