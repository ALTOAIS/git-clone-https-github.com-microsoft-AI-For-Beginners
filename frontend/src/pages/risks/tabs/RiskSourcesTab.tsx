import { useQuery } from '@tanstack/react-query';
import { Button, List, message, Modal, Select, Space, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sourcesApi } from '../../../api/endpoints';
import type { RiskDetail } from '../../../types';
import { sourceTypeLabel } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

export function RiskSourcesTab({ risk, onUpdated, canEdit }: Props) {
  const { t } = useTranslation();
  const [linking, setLinking] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>();

  const { data: allSources } = useQuery({
    queryKey: ['sources-all'],
    queryFn: () => sourcesApi.list({ pageSize: 200 }).then((r) => r.data.items),
  });

  const linkedIds = new Set(risk.sources.map((s) => s.source.id));
  const availableSources = allSources?.filter((s) => !linkedIds.has(s.id));

  const handleLink = async () => {
    if (!selectedSourceId) return;
    await sourcesApi.link(selectedSourceId, risk.id);
    message.success(t('riskSources.linked'));
    setLinking(false);
    setSelectedSourceId(undefined);
    onUpdated();
  };

  const handleUnlink = async (sourceId: string) => {
    await sourcesApi.unlink(sourceId, risk.id);
    message.success(t('riskSources.unlinked'));
    onUpdated();
  };

  return (
    <div>
      {canEdit && (
        <Button style={{ marginBottom: 16 }} onClick={() => setLinking(true)}>
          {t('riskSources.linkButton')}
        </Button>
      )}
      <List
        bordered
        dataSource={risk.sources}
        locale={{ emptyText: t('riskSources.noSourcesYet') }}
        renderItem={({ source }) => (
          <List.Item
            actions={canEdit ? [<a key="unlink" onClick={() => handleUnlink(source.id)}>{t('riskSources.unlink')}</a>] : undefined}
          >
            <List.Item.Meta
              title={source.title}
              description={
                <Space>
                  <Tag>{sourceTypeLabel(source.type)}</Tag>
                  {source.referenceNumber && <span>{t('riskSources.refPrefix')}: {source.referenceNumber}</span>}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title={t('riskSources.linkModalTitle')}
        open={linking}
        onCancel={() => setLinking(false)}
        onOk={handleLink}
        okButtonProps={{ disabled: !selectedSourceId }}
      >
        <Select
          style={{ width: '100%' }}
          placeholder={t('riskSources.selectPlaceholder')}
          showSearch
          optionFilterProp="label"
          value={selectedSourceId}
          onChange={setSelectedSourceId}
          options={availableSources?.map((s) => ({ value: s.id, label: `${s.title} (${sourceTypeLabel(s.type)})` }))}
        />
      </Modal>
    </div>
  );
}
