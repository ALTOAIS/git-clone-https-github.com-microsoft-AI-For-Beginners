import { Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import type { RiskDetail } from '../../../types';

interface Props {
  risk: RiskDetail;
}

export function RiskHistoryTab({ risk }: Props) {
  if (risk.history.length === 0) {
    return <Typography.Text type="secondary">No history recorded yet.</Typography.Text>;
  }

  return (
    <Timeline
      items={risk.history.map((entry) => ({
        children: (
          <div>
            <Typography.Text strong>Version {entry.version}</Typography.Text>
            <div style={{ color: '#888', fontSize: 12 }}>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</div>
            <div>{entry.changeNote ?? 'Updated'}</div>
          </div>
        ),
      }))}
    />
  );
}
