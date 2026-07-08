import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi, trainingPlansApi } from '../../api/endpoints';
import { ALL_ROLES, roleLabel } from '../../auth/roles';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { useUsersList } from '../../hooks/useReferenceData';
import type { TrainingPlanItem } from '../../types';
import {
  ALL_QUARTERS,
  ALL_TRAINING_PLAN_ITEM_STATUSES,
  ALL_TRAINING_PLAN_STATUSES,
  TRAINING_PLAN_ITEM_STATUS_COLORS,
  quarterLabel,
  trainingPlanItemStatusLabel,
  trainingPlanStatusLabel,
} from '../../utils/trainingPlanDisplay';

export function TrainingPlanPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [planForm] = Form.useForm();
  const [itemModal, setItemModal] = useState<{ quarter?: number; editing: TrainingPlanItem | null } | null>(null);
  const [itemForm] = Form.useForm();

  const { data: plans } = useQuery({
    queryKey: ['training-plans'],
    queryFn: () => trainingPlansApi.list({ pageSize: 50 }).then((r) => r.data),
  });

  useEffect(() => {
    if (!selectedPlanId && plans && plans.items.length > 0) {
      setSelectedPlanId(plans.items[0].id);
    }
  }, [plans, selectedPlanId]);

  const { data: plan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['training-plan', selectedPlanId],
    queryFn: () => trainingPlansApi.get(selectedPlanId!).then((r) => r.data),
    enabled: !!selectedPlanId,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-for-plan'],
    queryFn: () => academyApi.list({ pageSize: 200 }).then((r) => r.data),
  });

  const { data: users } = useUsersList();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['training-plans'] });
    queryClient.invalidateQueries({ queryKey: ['training-plan', selectedPlanId] });
  };

  const handleCreatePlan = async () => {
    const values = await planForm.validateFields();
    const { data: created } = await trainingPlansApi.create(values);
    message.success(t('trainingPlan.created'));
    setCreatePlanOpen(false);
    planForm.resetFields();
    queryClient.invalidateQueries({ queryKey: ['training-plans'] });
    setSelectedPlanId(created.id);
  };

  const openCreateItem = (quarter: number) => {
    itemForm.resetFields();
    itemForm.setFieldsValue({ quarter });
    setItemModal({ quarter, editing: null });
  };

  const openEditItem = (item: TrainingPlanItem) => {
    itemForm.setFieldsValue({
      courseId: item.courseId,
      quarter: item.quarter,
      targetRoles: item.targetRoles,
      responsibleId: item.responsibleId,
      status: item.status,
      notes: item.notes,
    });
    setItemModal({ editing: item });
  };

  const handleSaveItem = async () => {
    if (!plan) return;
    const values = await itemForm.validateFields();
    if (itemModal?.editing) {
      await trainingPlansApi.updateItem(plan.id, itemModal.editing.id, values);
      message.success(t('trainingPlan.itemUpdated'));
    } else {
      await trainingPlansApi.addItem(plan.id, values);
      message.success(t('trainingPlan.itemAdded'));
    }
    setItemModal(null);
    invalidate();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!plan) return;
    await trainingPlansApi.removeItem(plan.id, itemId);
    message.success(t('trainingPlan.itemRemoved'));
    invalidate();
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('trainingPlan.title')}
          <InfoTooltip text={t('tooltips.academy.trainingPlan')} />
        </Typography.Title>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setCreatePlanOpen(true)}>
            {t('trainingPlan.createButton')}
          </Button>
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>
      <Typography.Paragraph type="secondary">{t('trainingPlan.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 260 }}
          placeholder={t('trainingPlan.selectPlanPlaceholder')}
          value={selectedPlanId}
          onChange={setSelectedPlanId}
          options={plans?.items.map((p) => ({ value: p.id, label: `${p.year} — ${p.title}` }))}
        />
      </Space>

      {!selectedPlanId && <Empty description={t('trainingPlan.noPlansYet')} />}

      {selectedPlanId && (isLoadingPlan || !plan) && <Skeleton active paragraph={{ rows: 10 }} />}

      {plan && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Tag>{trainingPlanStatusLabel(plan.status)}</Tag>
          </Space>

          <Row gutter={16}>
            {ALL_QUARTERS.map((quarter) => (
              <Col xs={24} md={12} lg={6} key={quarter}>
                <Card
                  title={quarterLabel(quarter)}
                  size="small"
                  extra={
                    <a onClick={() => openCreateItem(quarter)}>
                      <PlusOutlined />
                    </a>
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {plan.items
                      .filter((item) => item.quarter === quarter)
                      .map((item) => (
                        <Card key={item.id} size="small" type="inner" title={item.course.title}>
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Tag color={TRAINING_PLAN_ITEM_STATUS_COLORS[item.status]}>
                              {trainingPlanItemStatusLabel(item.status)}
                            </Tag>
                            <Typography.Text type="secondary">
                              {item.targetRoles.length === 0
                                ? t('trainingPlan.allEmployees')
                                : item.targetRoles.map((r) => roleLabel(r)).join(', ')}
                            </Typography.Text>
                            {item.responsible && (
                              <Typography.Text type="secondary">
                                {t('trainingPlan.responsibleLabel')}: {item.responsible.fullName}
                              </Typography.Text>
                            )}
                            {item.notes && <Typography.Text type="secondary">{item.notes}</Typography.Text>}
                            <Space>
                              <a onClick={() => openEditItem(item)}>{t('courseEditor.editLink')}</a>
                              <Popconfirm title={t('trainingPlan.deleteItemConfirm')} onConfirm={() => handleDeleteItem(item.id)}>
                                <a>{t('courseEditor.deleteLink')}</a>
                              </Popconfirm>
                            </Space>
                          </Space>
                        </Card>
                      ))}
                    {plan.items.filter((item) => item.quarter === quarter).length === 0 && (
                      <Typography.Text type="secondary">{t('trainingPlan.noItemsInQuarter')}</Typography.Text>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      <Modal
        title={t('trainingPlan.createModalTitle')}
        open={createPlanOpen}
        onCancel={() => setCreatePlanOpen(false)}
        onOk={handleCreatePlan}
        destroyOnHidden
      >
        <Form form={planForm} layout="vertical" initialValues={{ status: 'DRAFT' }}>
          <Form.Item name="year" label={t('trainingPlan.yearLabel')} rules={[{ required: true }]}>
            <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="title" label={t('trainingPlan.planTitleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label={t('trainingPlan.statusLabel')}>
            <Select options={ALL_TRAINING_PLAN_STATUSES.map((v) => ({ value: v, label: trainingPlanStatusLabel(v) }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={itemModal?.editing ? t('trainingPlan.itemModalTitleEdit') : t('trainingPlan.itemModalTitleAdd')}
        open={!!itemModal}
        onCancel={() => setItemModal(null)}
        onOk={handleSaveItem}
        width={640}
        destroyOnHidden
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="courseId" label={t('trainingPlan.courseLabel')} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={courses?.items.map((c) => ({ value: c.id, label: c.title }))}
            />
          </Form.Item>
          <Form.Item name="quarter" label={t('trainingPlan.quarterLabel')} rules={[{ required: true }]}>
            <Select options={ALL_QUARTERS.map((q) => ({ value: q, label: quarterLabel(q) }))} />
          </Form.Item>
          <Form.Item
            name="targetRoles"
            label={
              <span>
                {t('trainingPlan.targetRolesLabel')}
                <InfoTooltip text={t('tooltips.academy.planTargetRoles')} />
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('trainingPlan.targetRolesPlaceholder')}
              options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
            />
          </Form.Item>
          <Form.Item name="responsibleId" label={t('trainingPlan.responsibleLabel')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          {itemModal?.editing && (
            <Form.Item name="status" label={t('trainingPlan.itemStatusLabel')}>
              <Select options={ALL_TRAINING_PLAN_ITEM_STATUSES.map((v) => ({ value: v, label: trainingPlanItemStatusLabel(v) }))} />
            </Form.Item>
          )}
          <Form.Item name="notes" label={t('trainingPlan.notesLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
