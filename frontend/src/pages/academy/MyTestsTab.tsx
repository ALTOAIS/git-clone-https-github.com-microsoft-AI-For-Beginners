import { useQuery } from '@tanstack/react-query';
import { Button, Empty, List, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';

export function MyTestsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['my-course-assignments'],
    queryFn: () => academyApi.myAssignments().then((r) => r.data),
  });

  return (
    <div>
      <Typography.Paragraph type="secondary">{t('myTests.description')}</Typography.Paragraph>
      <List
        loading={isFetching}
        dataSource={data}
        locale={{ emptyText: <Empty description={t('myTests.noAssignments')} /> }}
        renderItem={(assignment) => (
          <List.Item
            actions={[
              <Button key="take" onClick={() => navigate(`/academy/take-test/${assignment.course.id}`)}>
                {t('myTests.takeTestButton')}
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  {assignment.course.title}
                  {assignment.course.isMandatory && <Tag color="red">{t('myAcademy.mandatoryTag')}</Tag>}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
