import { useQuery } from '@tanstack/react-query';
import { Badge, Calendar, Empty, List, Skeleton, Space, Tag, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { CalendarDeadline, CalendarEvent } from '../../types';
import { COURSE_ASSIGNMENT_STATUS_COLORS, courseAssignmentStatusLabel, lessonContentTypeLabel } from '../../utils/academyDisplay';

export function AcademyCalendarPage() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['academy-calendar'],
    queryFn: () => academyApi.calendar().then((r) => r.data),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, { deadlines: CalendarDeadline[]; events: CalendarEvent[] }>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { deadlines: [], events: [] });
      return map.get(key)!;
    };
    for (const d of data?.deadlines ?? []) {
      ensure(d.dueDate.slice(0, 10)).deadlines.push(d);
    }
    for (const e of data?.events ?? []) {
      ensure(e.scheduledAt.slice(0, 10)).events.push(e);
    }
    return map;
  }, [data]);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const selectedKey = selectedDate?.format('YYYY-MM-DD');
  const selectedItems = selectedKey ? byDate.get(selectedKey) : undefined;

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('academyCalendar.title')}
          <InfoTooltip text={t('tooltips.academy.calendar')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('academyCalendar.description')}</Typography.Paragraph>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 560px', minWidth: 320 }}>
          <Calendar
            onSelect={setSelectedDate}
            fullCellRender={(date, info) => {
              if (info.type !== 'date') return info.originNode;
              const key = date.format('YYYY-MM-DD');
              const items = byDate.get(key);
              return (
                <div className="ant-picker-cell-inner" style={{ padding: 4 }}>
                  <div>{date.date()}</div>
                  {items?.deadlines.map((d) => (
                    <div key={d.id}>
                      <Badge color={COURSE_ASSIGNMENT_STATUS_COLORS[d.status] === 'default' ? '#8c8c8c' : undefined} status={d.status === 'COMPLETED' ? 'success' : 'warning'} text={t('academyCalendar.deadlineBadge')} />
                    </div>
                  ))}
                  {items?.events.map((e) => (
                    <div key={e.id}>
                      <Badge status="processing" text={t('academyCalendar.eventBadge')} />
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <Typography.Title level={5}>
            {selectedDate ? selectedDate.format('DD.MM.YYYY') : t('academyCalendar.selectDayHint')}
          </Typography.Title>
          {!selectedDate && <Typography.Text type="secondary">{t('academyCalendar.selectDayHint')}</Typography.Text>}
          {selectedDate && !selectedItems && <Empty description={t('academyCalendar.noEventsOnDay')} />}
          {selectedItems && (
            <List
              dataSource={[
                ...selectedItems.deadlines.map((d) => ({ key: `d-${d.id}`, node: renderDeadline(d, t) })),
                ...selectedItems.events.map((e) => ({ key: `e-${e.id}`, node: renderEvent(e, t) })),
              ]}
              renderItem={(item) => <List.Item key={item.key}>{item.node}</List.Item>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function renderDeadline(d: CalendarDeadline, t: (key: string, opts?: Record<string, unknown>) => string) {
  return (
    <Space direction="vertical" size={0}>
      <Typography.Text strong>{d.course.title}</Typography.Text>
      <Typography.Text type="secondary">
        {t('academyCalendar.deadlineFor', { name: d.user.fullName })}
      </Typography.Text>
      <Tag color={COURSE_ASSIGNMENT_STATUS_COLORS[d.status]}>{courseAssignmentStatusLabel(d.status)}</Tag>
    </Space>
  );
}

function renderEvent(e: CalendarEvent, t: (key: string, opts?: Record<string, unknown>) => string) {
  return (
    <Space direction="vertical" size={0}>
      <Typography.Text strong>{e.title}</Typography.Text>
      <Typography.Text type="secondary">
        {t('academyCalendar.eventFor', { course: e.module.course.title })}
      </Typography.Text>
      <Tag>{lessonContentTypeLabel(e.contentType)}</Tag>
    </Space>
  );
}
