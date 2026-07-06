import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Popconfirm, Progress, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi, campaignsApi, surveysApi } from '../../api/endpoints';
import { roleLabel } from '../../auth/roles';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { CampaignParticipant } from '../../types';
import { CAMPAIGN_STATUS_COLORS, campaignStatusLabel } from '../../utils/campaignDisplay';

export function CampaignDetailPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | undefined>();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: progress } = useQuery({
    queryKey: ['campaign-progress', id],
    queryFn: () => campaignsApi.getProgress(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: allCourses } = useQuery({
    queryKey: ['courses-for-campaign'],
    queryFn: () => academyApi.list({ pageSize: 200 }).then((r) => r.data),
  });

  const { data: allSurveys } = useQuery({
    queryKey: ['surveys-for-campaign'],
    queryFn: () => surveysApi.list({ pageSize: 200 }).then((r) => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    queryClient.invalidateQueries({ queryKey: ['campaign-progress', id] });
  };

  const handleLinkCourse = async () => {
    if (!selectedCourseId) return;
    await campaignsApi.linkCourse(id!, selectedCourseId);
    setSelectedCourseId(undefined);
    message.success(t('campaignDetail.courseLinked'));
    invalidate();
  };

  const handleUnlinkCourse = async (courseId: string) => {
    await campaignsApi.unlinkCourse(id!, courseId);
    message.success(t('campaignDetail.courseUnlinked'));
    invalidate();
  };

  const handleLinkSurvey = async () => {
    if (!selectedSurveyId) return;
    await campaignsApi.linkSurvey(id!, selectedSurveyId);
    setSelectedSurveyId(undefined);
    message.success(t('campaignDetail.surveyLinked'));
    invalidate();
  };

  const handleUnlinkSurvey = async (surveyId: string) => {
    await campaignsApi.unlinkSurvey(id!, surveyId);
    message.success(t('campaignDetail.surveyUnlinked'));
    invalidate();
  };

  if (isLoading || !campaign) return <Skeleton active paragraph={{ rows: 10 }} />;

  const linkedCourseIds = new Set(campaign.courses.map((c) => c.courseId));
  const linkedSurveyIds = new Set(campaign.surveys.map((s) => s.surveyId));
  const availableCourses = (allCourses?.items ?? []).filter((c) => !linkedCourseIds.has(c.id));
  const availableSurveys = (allSurveys?.items ?? []).filter((s) => !linkedSurveyIds.has(s.id));

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {campaign.title}
          <InfoTooltip text={t('tooltips.academy.campaigns')} />
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/academy/campaigns')}>{t('surveyEditor.backButton')}</Button>
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>
      <Space style={{ marginTop: 8 }}>
        <Tag color={CAMPAIGN_STATUS_COLORS[campaign.status]}>{campaignStatusLabel(campaign.status)}</Tag>
        {campaign.startDate && campaign.endDate && (
          <Typography.Text type="secondary">
            {campaign.startDate.slice(0, 10)} — {campaign.endDate.slice(0, 10)}
          </Typography.Text>
        )}
      </Space>
      {campaign.description && <Typography.Paragraph style={{ marginTop: 8 }}>{campaign.description}</Typography.Paragraph>}

      <Card title={t('campaignDetail.coursesCardTitle')} style={{ marginTop: 24 }}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={campaign.courses}
          locale={{ emptyText: t('campaignDetail.noCoursesYet') }}
          columns={[
            { title: t('campaignsPage.columns.title'), dataIndex: ['course', 'title'] },
            {
              title: t('campaignDetail.actionsColumn'),
              width: 100,
              render: (_: unknown, record: (typeof campaign.courses)[number]) => (
                <Popconfirm title={t('campaignDetail.unlinkConfirm')} onConfirm={() => handleUnlinkCourse(record.courseId)}>
                  <a>{t('courseEditor.deleteLink')}</a>
                </Popconfirm>
              ),
            },
          ]}
        />
        <Space style={{ marginTop: 12 }}>
          <Select
            style={{ width: 320 }}
            placeholder={t('campaignDetail.addCoursePlaceholder')}
            value={selectedCourseId}
            onChange={setSelectedCourseId}
            options={availableCourses.map((c) => ({ value: c.id, label: c.title }))}
            showSearch
            optionFilterProp="label"
          />
          <Button icon={<PlusOutlined />} onClick={handleLinkCourse} disabled={!selectedCourseId}>
            {t('campaignDetail.addButton')}
          </Button>
        </Space>
      </Card>

      <Card title={t('campaignDetail.surveysCardTitle')} style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={campaign.surveys}
          locale={{ emptyText: t('campaignDetail.noSurveysYet') }}
          columns={[
            { title: t('campaignsPage.columns.title'), dataIndex: ['survey', 'title'] },
            {
              title: t('campaignDetail.actionsColumn'),
              width: 100,
              render: (_: unknown, record: (typeof campaign.surveys)[number]) => (
                <Popconfirm title={t('campaignDetail.unlinkConfirm')} onConfirm={() => handleUnlinkSurvey(record.surveyId)}>
                  <a>{t('courseEditor.deleteLink')}</a>
                </Popconfirm>
              ),
            },
          ]}
        />
        <Space style={{ marginTop: 12 }}>
          <Select
            style={{ width: 320 }}
            placeholder={t('campaignDetail.addSurveyPlaceholder')}
            value={selectedSurveyId}
            onChange={setSelectedSurveyId}
            options={availableSurveys.map((s) => ({ value: s.id, label: s.title }))}
            showSearch
            optionFilterProp="label"
          />
          <Button icon={<PlusOutlined />} onClick={handleLinkSurvey} disabled={!selectedSurveyId}>
            {t('campaignDetail.addButton')}
          </Button>
        </Space>
      </Card>

      <Card title={t('campaignDetail.progressCardTitle')} style={{ marginTop: 16 }}>
        <Table
          rowKey={(record: CampaignParticipant) => record.user.id}
          size="small"
          pagination={false}
          dataSource={progress?.participants}
          locale={{ emptyText: t('campaignDetail.noParticipants') }}
          columns={[
            { title: t('campaignDetail.progressColumns.user'), dataIndex: ['user', 'fullName'] },
            {
              title: t('campaignDetail.progressColumns.role'),
              dataIndex: ['user', 'role'],
              render: (v: CampaignParticipant['user']['role']) => roleLabel(v),
            },
            {
              title: t('campaignDetail.progressColumns.progress'),
              width: 260,
              render: (_: unknown, record: CampaignParticipant) => (
                <Space direction="vertical" style={{ width: '100%' }} size={0}>
                  <Progress percent={record.percent} size="small" />
                  <Typography.Text type="secondary">
                    {t('campaignDetail.progressColumns.itemsCompleted', {
                      completed: record.completedItems,
                      total: record.totalItems,
                    })}
                  </Typography.Text>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
