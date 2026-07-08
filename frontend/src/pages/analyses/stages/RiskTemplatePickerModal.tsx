import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Modal, Select, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { riskTemplatesApi } from '../../../api/endpoints';
import { SCORE_LEVEL_COLORS, riskTemplateDirectionLabel, scoreLevel } from '../../../utils/riskDisplay';
import { ALL_RISK_TEMPLATE_DIRECTIONS, type RiskTemplate, type RiskTemplateDirection } from '../../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: RiskTemplate) => void;
}

export function RiskTemplatePickerModal({ open, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<RiskTemplateDirection | undefined>();

  const { data, isFetching } = useQuery({
    queryKey: ['risk-templates-picker', { search, direction }],
    queryFn: () =>
      riskTemplatesApi
        .list({ page: 1, pageSize: 50, search: search || undefined, direction })
        .then((r) => r.data),
    enabled: open,
  });

  return (
    <Modal
      title={t('riskTemplatePicker.modalTitle')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Input.Search
        placeholder={t('riskTemplatePicker.searchPlaceholder')}
        allowClear
        style={{ marginBottom: 12, width: 320 }}
        onSearch={setSearch}
      />
      <Select
        allowClear
        placeholder={t('riskTemplatePicker.directionPlaceholder')}
        style={{ marginBottom: 12, marginLeft: 12, width: 260 }}
        value={direction}
        onChange={setDirection}
        options={ALL_RISK_TEMPLATE_DIRECTIONS.map((value) => ({ value, label: riskTemplateDirectionLabel(value) }))}
      />
      <Table
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={data?.items}
        pagination={false}
        scroll={{ y: 400 }}
        onRow={(record) => ({ onClick: () => onSelect(record), style: { cursor: 'pointer' } })}
        columns={[
          { title: t('riskTemplateLibrary.columns.code'), dataIndex: 'code', width: 100 },
          { title: t('riskTemplateLibrary.columns.title'), dataIndex: 'title' },
          {
            title: t('riskTemplateLibrary.columns.direction'),
            dataIndex: 'direction',
            width: 200,
            render: (value: RiskTemplateDirection) => riskTemplateDirectionLabel(value),
          },
          {
            title: t('riskTemplateLibrary.columns.level'),
            dataIndex: 'baseScore',
            width: 90,
            render: (value: number) => {
              const level = scoreLevel(value);
              return <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined}>{value}</Tag>;
            },
          },
        ]}
      />
    </Modal>
  );
}
