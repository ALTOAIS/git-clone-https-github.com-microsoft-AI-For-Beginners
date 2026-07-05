import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <Tooltip title={text} trigger={['hover', 'click']} placement="top">
      <InfoCircleOutlined
        style={{ color: '#8c8c8c', marginLeft: 6, fontSize: 13, cursor: 'help', verticalAlign: 'middle' }}
        onClick={(e) => e.stopPropagation()}
      />
    </Tooltip>
  );
}
