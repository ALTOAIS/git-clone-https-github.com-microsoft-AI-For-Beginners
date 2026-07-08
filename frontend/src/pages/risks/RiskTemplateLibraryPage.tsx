import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Descriptions, Drawer, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { riskTemplatesApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { useCategories } from '../../hooks/useReferenceData';
import type { RiskTemplate, RiskTemplateDirection } from '../../types';
import { ALL_RISK_TEMPLATE_DIRECTIONS } from '../../types';
import { SCORE_LEVEL_COLORS, riskTemplateDirectionLabel, scoreLevel, scoreLevelLabel } from '../../utils/riskDisplay';
import { CreateRiskFromTemplateModal } from './CreateRiskFromTemplateModal';
import { GenerateRiskTemplateModal } from './GenerateRiskTemplateModal';
import { RiskTemplateAiPanel } from './RiskTemplateAiPanel';
import { RiskTemplateFormModal } from './RiskTemplateFormModal';

const EDIT_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function RiskTemplateLibraryPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && EDIT_ROLES.includes(user.role);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [direction, setDirection] = useState<RiskTemplateDirection | undefined>();
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined>();
  const [tags, setTags] = useState<string[]>([]);

  const [viewing, setViewing] = useState<RiskTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RiskTemplate | null>(null);
  const [creatingFrom, setCreatingFrom] = useState<RiskTemplate | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<Partial<RiskTemplate> | undefined>();

  const { data: categories } = useCategories();
  const { data: tagOptions } = useQuery({ queryKey: ['risk-template-tags'], queryFn: () => riskTemplatesApi.listTags().then((r) => r.data) });

  const queryParams = {
    page,
    pageSize: 20,
    search: search || undefined,
    categoryId,
    direction,
    riskLevel,
    tags: tags.length ? tags.join(',') : undefined,
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['risk-templates', queryParams],
    queryFn: () => riskTemplatesApi.list(queryParams).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['risk-templates'] });
    queryClient.invalidateQueries({ queryKey: ['risk-template-tags'] });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (template: RiskTemplate) => {
    setEditing(template);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    message.success(editing ? t('riskTemplateForm.updated') : t('riskTemplateForm.created'));
    invalidate();
  };

  const handleDuplicate = async (template: RiskTemplate) => {
    await riskTemplatesApi.duplicate(template.id);
    message.success(t('riskTemplateLibrary.duplicated'));
    invalidate();
  };

  const handleDeactivate = async (template: RiskTemplate) => {
    await riskTemplatesApi.remove(template.id);
    message.success(t('riskTemplateLibrary.deactivated'));
    invalidate();
  };

  const renderLevel = (template: RiskTemplate) => {
    const level = scoreLevel(template.baseScore);
    return level ? <Tag color={SCORE_LEVEL_COLORS[level]}>{scoreLevelLabel(level)}</Tag> : null;
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
          {t('riskTemplateLibrary.description')}
        </Typography.Paragraph>
        {canManage && (
          <Space>
            <Button onClick={() => setGenerateOpen(true)}>{t('riskTemplateLibrary.generateFromProcessButton')}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('riskTemplateLibrary.createButton')}
            </Button>
          </Space>
        )}
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('riskTemplateLibrary.searchPlaceholder')}
          allowClear
          style={{ width: 260 }}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder={t('riskTemplateLibrary.categoryPlaceholder')}
          style={{ width: 220 }}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
          options={categories?.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          allowClear
          placeholder={t('riskTemplateLibrary.directionPlaceholder')}
          style={{ width: 240 }}
          value={direction}
          onChange={(v) => {
            setDirection(v);
            setPage(1);
          }}
          options={ALL_RISK_TEMPLATE_DIRECTIONS.map((d) => ({ value: d, label: riskTemplateDirectionLabel(d) }))}
        />
        <Select
          allowClear
          placeholder={t('riskTemplateLibrary.levelPlaceholder')}
          style={{ width: 180 }}
          value={riskLevel}
          onChange={(v) => {
            setRiskLevel(v);
            setPage(1);
          }}
          options={(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((l) => ({ value: l, label: scoreLevelLabel(l) }))}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder={t('riskTemplateLibrary.tagsPlaceholder')}
          style={{ width: 220 }}
          value={tags}
          onChange={(v) => {
            setTags(v);
            setPage(1);
          }}
          options={tagOptions?.map((tag) => ({ value: tag, label: tag }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total,
          onChange: setPage,
        }}
        columns={[
          { title: t('riskTemplateLibrary.columns.code'), dataIndex: 'code', width: 100 },
          {
            title: t('riskTemplateLibrary.columns.title'),
            dataIndex: 'title',
            render: (title: string, record: RiskTemplate) => <a onClick={() => setViewing(record)}>{title}</a>,
          },
          {
            title: t('riskTemplateLibrary.columns.direction'),
            dataIndex: 'direction',
            width: 220,
            render: (v: RiskTemplateDirection) => riskTemplateDirectionLabel(v),
          },
          {
            title: t('riskTemplateLibrary.columns.category'),
            dataIndex: ['category', 'name'],
            width: 200,
            render: (v: string | undefined) => v ?? '—',
          },
          {
            title: t('riskTemplateLibrary.columns.level'),
            width: 130,
            render: (_: unknown, record: RiskTemplate) => renderLevel(record),
          },
          {
            title: t('riskTemplateLibrary.columns.status'),
            dataIndex: 'isActive',
            width: 110,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('common.active') : t('common.inactive')}</Tag>,
          },
          {
            title: t('riskTemplateLibrary.columns.actions'),
            width: 260,
            render: (_: unknown, record: RiskTemplate) => (
              <Space wrap>
                <a onClick={() => setCreatingFrom(record)}>{t('riskTemplateLibrary.useTemplateLink')}</a>
                {canManage && (
                  <>
                    <a onClick={() => openEdit(record)}>{t('riskTemplateLibrary.editLink')}</a>
                    <a onClick={() => handleDuplicate(record)}>{t('riskTemplateLibrary.duplicateLink')}</a>
                    {record.isActive && (
                      <Popconfirm title={t('riskTemplateLibrary.deactivateConfirm')} onConfirm={() => handleDeactivate(record)}>
                        <a>{t('riskTemplateLibrary.deactivateLink')}</a>
                      </Popconfirm>
                    )}
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title={viewing?.title}
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={640}
        destroyOnHidden
        extra={
          viewing && (
            <Button type="primary" onClick={() => setCreatingFrom(viewing)}>
              {t('riskTemplateLibrary.createRiskButton')}
            </Button>
          )
        }
      >
        {viewing && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('riskTemplateLibrary.columns.code')}>{viewing.code}</Descriptions.Item>
              <Descriptions.Item label={t('riskTemplateLibrary.columns.direction')}>
                {riskTemplateDirectionLabel(viewing.direction)}
              </Descriptions.Item>
              <Descriptions.Item label={t('riskTemplateLibrary.columns.category')}>{viewing.category?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label={t('riskTemplateForm.descriptionLabel')}>{viewing.description}</Descriptions.Item>
              {viewing.corruptionScheme && (
                <Descriptions.Item label={t('riskTemplateForm.corruptionSchemeLabel')}>{viewing.corruptionScheme}</Descriptions.Item>
              )}
              {viewing.causes && <Descriptions.Item label={t('riskTemplateForm.causesLabel')}>{viewing.causes}</Descriptions.Item>}
              {viewing.corruptionFactors && (
                <Descriptions.Item label={t('riskTemplateForm.corruptionFactorsLabel')}>{viewing.corruptionFactors}</Descriptions.Item>
              )}
              {viewing.consequences && (
                <Descriptions.Item label={t('riskTemplateForm.consequencesLabel')}>{viewing.consequences}</Descriptions.Item>
              )}
              {viewing.redFlags && <Descriptions.Item label={t('riskTemplateForm.redFlagsLabel')}>{viewing.redFlags}</Descriptions.Item>}
              <Descriptions.Item label={t('riskTemplateForm.typicalControlsLabel')}>
                {viewing.typicalControls.length ? (
                  <Space direction="vertical">
                    {viewing.typicalControls.map((c) => (
                      <Typography.Text key={c}>• {c}</Typography.Text>
                    ))}
                  </Space>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('riskTemplateForm.recommendedActionsLabel')}>
                {viewing.recommendedActions.length ? (
                  <Space direction="vertical">
                    {viewing.recommendedActions.map((a) => (
                      <Typography.Text key={a}>• {a}</Typography.Text>
                    ))}
                  </Space>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('riskTemplateLibrary.columns.level')}>
                {renderLevel(viewing)} ({viewing.baseProbability} × {viewing.baseImpact} = {viewing.baseScore})
              </Descriptions.Item>
              <Descriptions.Item label={t('riskTemplateForm.tagsLabel')}>
                {viewing.tags.length ? viewing.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '—'}
              </Descriptions.Item>
            </Descriptions>

            <RiskTemplateAiPanel
              template={viewing}
              onApplied={(patch) => {
                setViewing({ ...viewing, ...patch });
                invalidate();
              }}
            />
          </>
        )}
      </Drawer>

      <RiskTemplateFormModal
        open={formOpen}
        editing={editing}
        initialValues={generatedDraft}
        onClose={() => {
          setFormOpen(false);
          setGeneratedDraft(undefined);
        }}
        onSaved={() => {
          setGeneratedDraft(undefined);
          handleSaved();
        }}
      />

      <GenerateRiskTemplateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={(draft) => {
          setGenerateOpen(false);
          setEditing(null);
          setGeneratedDraft(draft);
          setFormOpen(true);
        }}
      />

      <CreateRiskFromTemplateModal
        template={creatingFrom}
        onClose={() => setCreatingFrom(null)}
        onCreated={(riskId) => {
          setCreatingFrom(null);
          setViewing(null);
          refetch();
          navigate(`/risks/${riskId}`);
        }}
      />
    </div>
  );
}
