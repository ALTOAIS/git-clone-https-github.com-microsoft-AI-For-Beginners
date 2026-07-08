import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Space, Table } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import { useUsersList } from '../../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisRecommendation } from '../../../types';
import { ALL_RECOMMENDATION_TYPES, recommendationTypeLabel } from '../../../utils/analysisDisplay';
import { AnalysisNavigatorPanel } from '../AnalysisNavigatorPanel';
import { buildScopedQuestionKey, RECOMMENDATION_SUBQUESTIONS } from '../navigatorQuestions';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage9RecommendationsTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnalysisRecommendation | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: users } = useUsersList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (recommendation: AnalysisRecommendation) => {
    setEditing(recommendation);
    form.setFieldsValue(recommendation);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await analysesApi.updateRecommendation(analysis.id, editing.id, values);
        message.success(t('analysisStage9.updated'));
      } else {
        await analysesApi.addRecommendation(analysis.id, values);
        message.success(t('analysisStage9.added'));
      }
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await analysesApi.removeRecommendation(analysis.id, id);
    message.success(t('analysisStage9.removed'));
    onUpdated();
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage9.intro')}
          <InfoTooltip text={t('tooltips.analyses.recommendations')} />
        </span>
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {t('analysisStage9.addButton')}
        </Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={analysis.recommendations}
        pagination={false}
        locale={{ emptyText: t('analysisStage9.noRecommendationsYet') }}
        expandable={{
          expandedRowRender: (recommendation) => (
            <AnalysisNavigatorPanel
              analysisId={analysis.id}
              title={t('analysisStage9.recommendationQuestionsTitle')}
              questions={RECOMMENDATION_SUBQUESTIONS.map((q) => ({
                key: buildScopedQuestionKey('rec', recommendation.id, q.key),
                label: q.label,
              }))}
            />
          ),
        }}
        columns={[
          {
            title: (
              <span>
                {t('analysisStage9.columns.type')}
                <InfoTooltip text={t('tooltips.analyses.recommendationType')} />
              </span>
            ),
            dataIndex: 'type',
            width: 200,
            render: (v: AnalysisRecommendation['type']) => recommendationTypeLabel(v),
          },
          { title: t('analysisStage9.columns.description'), dataIndex: 'description' },
          { title: t('analysisStage9.columns.risk'), dataIndex: ['risk', 'title'], width: 240, render: (v: string | null) => v ?? '—' },
          {
            title: t('analysisStage9.columns.responsible'),
            dataIndex: ['responsible', 'fullName'],
            width: 160,
            render: (v: string | null) => v ?? '—',
          },
          {
            title: t('analysisStage9.columns.actions'),
            width: 140,
            render: (_: unknown, record: AnalysisRecommendation) => (
              <>
                <a onClick={() => openEdit(record)}>{t('analysisStage9.editLink')}</a>{' '}
                <Popconfirm title={t('analysisStage9.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <a>{t('analysisStage9.deleteLink')}</a>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('analysisStage9.modalTitleEdit') : t('analysisStage9.modalTitleAdd')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="riskId" label={t('analysisStage9.riskLabel')}>
            <Select allowClear options={analysis.risks.map((r) => ({ value: r.id, label: r.title }))} />
          </Form.Item>
          <Form.Item
            name="type"
            label={
              <span>
                {t('analysisStage9.typeLabel')}
                <InfoTooltip text={t('tooltips.analyses.recommendationType')} />
              </span>
            }
            rules={[{ required: true }]}
          >
            <Select options={ALL_RECOMMENDATION_TYPES.map((value) => ({ value, label: recommendationTypeLabel(value) }))} />
          </Form.Item>
          <Form.Item name="description" label={t('analysisStage9.descriptionLabel')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="responsibleId" label={t('analysisStage9.responsibleLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
