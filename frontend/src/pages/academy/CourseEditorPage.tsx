import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { ALL_ROLES, roleLabel } from '../../auth/roles';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { CourseLesson, CourseModule } from '../../types';
import { ALL_COURSE_STATUSES, ALL_LESSON_CONTENT_TYPES, courseStatusLabel, lessonContentTypeLabel } from '../../utils/academyDisplay';
import { TestEditorSection } from './TestEditorSection';

export function CourseEditorPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [metaForm] = Form.useForm();
  const [moduleModal, setModuleModal] = useState<{ editing: CourseModule | null } | null>(null);
  const [moduleForm] = Form.useForm();
  const [lessonModal, setLessonModal] = useState<{ moduleId: string; editing: CourseLesson | null } | null>(null);
  const [lessonForm] = Form.useForm();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => academyApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (course) {
      metaForm.setFieldsValue({
        title: course.title,
        description: course.description,
        status: course.status,
        isMandatory: course.isMandatory,
        applicableRoles: course.applicableRoles,
      });
    }
  }, [course, metaForm]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['course', id] });

  const handleSaveMeta = async () => {
    const values = await metaForm.validateFields();
    await academyApi.update(id!, values);
    message.success(t('courseEditor.saved'));
    invalidate();
  };

  const openCreateModule = () => {
    moduleForm.resetFields();
    moduleForm.setFieldsValue({ order: (course?.modules.length ?? 0) + 1 });
    setModuleModal({ editing: null });
  };

  const openEditModule = (module: CourseModule) => {
    moduleForm.setFieldsValue({ order: module.order, title: module.title });
    setModuleModal({ editing: module });
  };

  const handleSaveModule = async () => {
    const values = await moduleForm.validateFields();
    if (moduleModal?.editing) {
      await academyApi.updateModule(id!, moduleModal.editing.id, values);
      message.success(t('courseEditor.moduleUpdated'));
    } else {
      await academyApi.addModule(id!, values);
      message.success(t('courseEditor.moduleAdded'));
    }
    setModuleModal(null);
    invalidate();
  };

  const handleDeleteModule = async (moduleId: string) => {
    await academyApi.removeModule(id!, moduleId);
    message.success(t('courseEditor.moduleRemoved'));
    invalidate();
  };

  const openCreateLesson = (moduleId: string, existingCount: number) => {
    lessonForm.resetFields();
    lessonForm.setFieldsValue({ order: existingCount + 1 });
    setLessonModal({ moduleId, editing: null });
  };

  const openEditLesson = (moduleId: string, lesson: CourseLesson) => {
    lessonForm.setFieldsValue({
      ...lesson,
      scheduledAt: lesson.scheduledAt ? dayjs(lesson.scheduledAt) : undefined,
    });
    setLessonModal({ moduleId, editing: lesson });
  };

  const handleSaveLesson = async () => {
    if (!lessonModal) return;
    const values = await lessonForm.validateFields();
    const payload = {
      ...values,
      scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
    };
    if (lessonModal.editing) {
      await academyApi.updateLesson(id!, lessonModal.editing.id, payload);
      message.success(t('courseEditor.lessonUpdated'));
    } else {
      await academyApi.addLesson(id!, lessonModal.moduleId, payload);
      message.success(t('courseEditor.lessonAdded'));
    }
    setLessonModal(null);
    invalidate();
  };

  const handleDeleteLesson = async (lessonId: string) => {
    await academyApi.removeLesson(id!, lessonId);
    message.success(t('courseEditor.lessonRemoved'));
    invalidate();
  };

  if (isLoading || !course) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('courseEditor.title')}
          <InfoTooltip text={t('tooltips.academy.courseConstructor')} />
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/academy/courses')}>{t('courseEditor.backButton')}</Button>
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>

      <Card title={t('courseEditor.metaCardTitle')} style={{ marginTop: 16 }}>
        <Form form={metaForm} layout="vertical">
          <Form.Item
            name="title"
            label={t('courseEditor.form.titleLabel')}
            rules={[{ required: true, message: t('courseEditor.form.titleRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('courseEditor.form.descriptionLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label={t('courseEditor.form.statusLabel')}>
            <Select options={ALL_COURSE_STATUSES.map((value) => ({ value, label: courseStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item name="isMandatory" label={t('courseEditor.form.mandatoryLabel')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="applicableRoles"
            label={
              <span>
                {t('courseEditor.form.applicableRolesLabel')}
                <InfoTooltip text={t('tooltips.academy.applicableRoles')} />
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('courseEditor.form.applicableRolesPlaceholder')}
              options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
            />
          </Form.Item>
          <Button type="primary" onClick={handleSaveMeta}>
            {t('courseEditor.saveButton')}
          </Button>
        </Form>
      </Card>

      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('courseEditor.modulesTitle')}
          <InfoTooltip text={t('tooltips.academy.modules')} />
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreateModule}>
          {t('courseEditor.addModuleButton')}
        </Button>
      </Space>

      <Collapse
        items={[...course.modules]
          .sort((a, b) => a.order - b.order)
          .map((module) => ({
            key: module.id,
            label: `${module.order}. ${module.title}`,
            extra: (
              <Space onClick={(e) => e.stopPropagation()}>
                <EditOutlined onClick={() => openEditModule(module)} />
                <Popconfirm title={t('courseEditor.deleteModuleConfirm')} onConfirm={() => handleDeleteModule(module.id)}>
                  <DeleteOutlined />
                </Popconfirm>
              </Space>
            ),
            children: (
              <div>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={[...module.lessons].sort((a, b) => a.order - b.order)}
                  locale={{ emptyText: t('courseEditor.noLessonsYet') }}
                  columns={[
                    { title: t('courseEditor.lessonColumns.order'), dataIndex: 'order', width: 60 },
                    { title: t('courseEditor.lessonColumns.title'), dataIndex: 'title' },
                    {
                      title: t('courseEditor.lessonColumns.contentType'),
                      dataIndex: 'contentType',
                      width: 200,
                      render: (v: CourseLesson['contentType']) => <Tag>{lessonContentTypeLabel(v)}</Tag>,
                    },
                    {
                      title: t('courseEditor.lessonColumns.duration'),
                      dataIndex: 'durationMinutes',
                      width: 120,
                      render: (v: number | null) => (v ? t('courseEditor.durationMinutes', { count: v }) : '—'),
                    },
                    {
                      title: t('courseEditor.lessonColumns.actions'),
                      width: 120,
                      render: (_: unknown, lesson: CourseLesson) => (
                        <Space>
                          <a onClick={() => openEditLesson(module.id, lesson)}>{t('courseEditor.editLink')}</a>
                          <Popconfirm title={t('courseEditor.deleteLessonConfirm')} onConfirm={() => handleDeleteLesson(lesson.id)}>
                            <a>{t('courseEditor.deleteLink')}</a>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                  onClick={() => openCreateLesson(module.id, module.lessons.length)}
                >
                  {t('courseEditor.addLessonButton')}
                </Button>
              </div>
            ),
          }))}
      />

      <Modal
        title={moduleModal?.editing ? t('courseEditor.moduleModalTitleEdit') : t('courseEditor.moduleModalTitleAdd')}
        open={!!moduleModal}
        onCancel={() => setModuleModal(null)}
        onOk={handleSaveModule}
        destroyOnHidden
      >
        <Form form={moduleForm} layout="vertical">
          <Form.Item name="order" label={t('courseEditor.form.orderLabel')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="title" label={t('courseEditor.form.moduleTitleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={lessonModal?.editing ? t('courseEditor.lessonModalTitleEdit') : t('courseEditor.lessonModalTitleAdd')}
        open={!!lessonModal}
        onCancel={() => setLessonModal(null)}
        onOk={handleSaveLesson}
        width={640}
        destroyOnHidden
      >
        <Form form={lessonForm} layout="vertical">
          <Form.Item name="order" label={t('courseEditor.form.orderLabel')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="title" label={t('courseEditor.form.lessonTitleLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="contentType"
            label={
              <span>
                {t('courseEditor.form.contentTypeLabel')}
                <InfoTooltip text={t('tooltips.academy.contentTypes')} />
              </span>
            }
            rules={[{ required: true }]}
          >
            <Select options={ALL_LESSON_CONTENT_TYPES.map((value) => ({ value, label: lessonContentTypeLabel(value) }))} />
          </Form.Item>
          <Form.Item name="content" label={t('courseEditor.form.contentLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="durationMinutes" label={t('courseEditor.form.durationLabel')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="scheduledAt"
            label={
              <span>
                {t('courseEditor.form.scheduledAtLabel')}
                <InfoTooltip text={t('tooltips.academy.scheduledAt')} />
              </span>
            }
          >
            <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <TestEditorSection courseId={id!} />
    </div>
  );
}
