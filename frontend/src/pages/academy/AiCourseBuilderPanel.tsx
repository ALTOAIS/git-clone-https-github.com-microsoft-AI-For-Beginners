import { CloseOutlined, RobotOutlined } from '@ant-design/icons';
import { App, Button, Card, Drawer, Input, InputNumber, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, academyApi } from '../../api/endpoints';
import type { LessonContentType } from '../../types';

interface EditableLesson {
  title: string;
  contentType: LessonContentType;
  content: string;
}

interface EditableModule {
  title: string;
  lessons: EditableLesson[];
}

interface Props {
  courseId: string;
  courseTitle: string;
  onUpdated: () => void;
}

export function AiCourseBuilderPanel({ courseId, courseTitle, onUpdated }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [topic, setTopic] = useState(courseTitle);
  const [audienceHint, setAudienceHint] = useState('');
  const [moduleCount, setModuleCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [modules, setModules] = useState<EditableModule[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const { data } = await aiApi.generateCourseOutline({
        courseId,
        topic,
        audienceHint: audienceHint || undefined,
        moduleCount,
      });
      setDescription(data.description);
      setModules(
        data.modules.map((m) => ({
          title: m.title,
          lessons: m.lessons.map((l) => ({
            title: l.title,
            contentType: l.contentType,
            content: l.content ?? '',
          })),
        })),
      );
      setDrawerOpen(true);
    } catch {
      message.error(t('aiCourseBuilder.errorGeneric'));
    } finally {
      setGenerating(false);
    }
  };

  const updateModuleTitle = (moduleIndex: number, title: string) =>
    setModules((prev) => prev.map((m, i) => (i === moduleIndex ? { ...m, title } : m)));

  const removeModule = (moduleIndex: number) =>
    setModules((prev) => prev.filter((_, i) => i !== moduleIndex));

  const updateLesson = (moduleIndex: number, lessonIndex: number, patch: Partial<EditableLesson>) =>
    setModules((prev) =>
      prev.map((m, i) =>
        i === moduleIndex
          ? { ...m, lessons: m.lessons.map((l, j) => (j === lessonIndex ? { ...l, ...patch } : l)) }
          : m,
      ),
    );

  const removeLesson = (moduleIndex: number, lessonIndex: number) =>
    setModules((prev) =>
      prev.map((m, i) => (i === moduleIndex ? { ...m, lessons: m.lessons.filter((_, j) => j !== lessonIndex) } : m)),
    );

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      if (description.trim()) {
        await academyApi.update(courseId, { description });
      }
      let moduleOrder = 1;
      for (const module of modules) {
        if (!module.title.trim()) continue;
        const { data: createdModule } = await academyApi.addModule(courseId, {
          order: moduleOrder++,
          title: module.title,
        });
        let lessonOrder = 1;
        for (const lesson of module.lessons) {
          if (!lesson.title.trim()) continue;
          await academyApi.addLesson(courseId, createdModule.id, {
            order: lessonOrder++,
            title: lesson.title,
            contentType: lesson.contentType,
            content: lesson.content || undefined,
          });
        }
      }
      message.success(t('aiCourseBuilder.added'));
      setDrawerOpen(false);
      onUpdated();
    } catch {
      message.error(t('aiCourseBuilder.errorGeneric'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined />
            {t('aiCourseBuilder.panelTitle')}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Typography.Text type="secondary">{t('aiCourseBuilder.panelDescription')}</Typography.Text>
          <Space wrap style={{ width: '100%' }}>
            <Input
              placeholder={t('aiCourseBuilder.topicPlaceholder')}
              style={{ width: 320 }}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Input
              placeholder={t('aiCourseBuilder.audiencePlaceholder')}
              style={{ width: 240 }}
              value={audienceHint}
              onChange={(e) => setAudienceHint(e.target.value)}
            />
            <InputNumber min={1} max={6} value={moduleCount} onChange={(v) => setModuleCount(v ?? 3)} addonBefore={t('aiCourseBuilder.moduleCountLabel')} />
            <Button type="primary" loading={generating} disabled={!topic.trim()} onClick={handleGenerate}>
              {t('aiCourseBuilder.generateButton')}
            </Button>
          </Space>
        </Space>
      </Card>

      <Drawer
        title={t('aiCourseBuilder.drawerTitle')}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        destroyOnHidden
        extra={
          <Button type="primary" loading={confirming} onClick={handleConfirm}>
            {t('aiCourseBuilder.addToCourseButton')}
          </Button>
        }
      >
        <Typography.Text strong>{t('aiCourseBuilder.descriptionLabel')}</Typography.Text>
        <Input.TextArea rows={2} style={{ marginBottom: 16 }} value={description} onChange={(e) => setDescription(e.target.value)} />

        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {modules.map((module, moduleIndex) => (
            <Card
              key={moduleIndex}
              size="small"
              title={<Input value={module.title} onChange={(e) => updateModuleTitle(moduleIndex, e.target.value)} />}
              extra={
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => removeModule(moduleIndex)}
                  aria-label={t('aiCourseBuilder.removeModule')}
                />
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={lessonIndex} style={{ borderTop: lessonIndex > 0 ? '1px solid #f0f0f0' : undefined, paddingTop: lessonIndex > 0 ? 12 : 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Input
                        value={lesson.title}
                        onChange={(e) => updateLesson(moduleIndex, lessonIndex, { title: e.target.value })}
                        style={{ marginBottom: 8 }}
                      />
                      <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => removeLesson(moduleIndex, lessonIndex)}
                        aria-label={t('aiCourseBuilder.removeLesson')}
                      />
                    </Space>
                    <Input.TextArea
                      rows={4}
                      value={lesson.content}
                      onChange={(e) => updateLesson(moduleIndex, lessonIndex, { content: e.target.value })}
                    />
                  </div>
                ))}
              </Space>
            </Card>
          ))}
        </Space>

        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
          {t('aiCourseBuilder.disclaimer')}
        </Typography.Text>
      </Drawer>
    </>
  );
}
