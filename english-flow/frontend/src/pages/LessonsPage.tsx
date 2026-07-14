import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Lesson } from '../api/types';
import {
  Badge,
  Button,
  Card,
  PageTitle,
  Spinner,
  levelLabel,
} from '../components/ui';

type LessonListItem = Omit<Lesson, 'contentJson'>;

function LessonCard({ lesson }: { lesson: LessonListItem }) {
  const { t } = useTranslation();
  const completed = (lesson.attempts?.length ?? 0) > 0;
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{lesson.title}</span>
          <Badge tone="blue">{levelLabel(lesson.level)}</Badge>
          {completed && <Badge tone="green">{t('lesson.completedBadge')}</Badge>}
          {lesson.status === 'DRAFT' && (
            <Badge tone="amber">{t('lesson.draftBadge')}</Badge>
          )}
        </div>
        {lesson.objective && (
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{lesson.objective}</p>
        )}
        <div className="mt-1 text-xs text-slate-400">
          {lesson.durationMinutes} {t('app.minutes_short')}
        </div>
      </div>
      <Link to={lesson.status === 'DRAFT' ? `/generator?draft=${lesson.id}` : `/lessons/${lesson.id}`}>
        <Button variant={completed ? 'secondary' : 'primary'}>
          {lesson.status === 'DRAFT'
            ? t('lesson.draftBadge')
            : completed
              ? t('lesson.repeat')
              : t('lesson.start')}
        </Button>
      </Link>
    </Card>
  );
}

export default function LessonsPage() {
  const { t } = useTranslation();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => api.get<LessonListItem[]>('/lessons'),
  });
  const { data: today } = useQuery({
    queryKey: ['lesson-today'],
    queryFn: () => api.get<LessonListItem | null>('/lessons/today'),
  });

  if (isLoading) return <Spinner />;

  const seedLessons = (lessons ?? []).filter((l) => l.source === 'SEED');
  const ownLessons = (lessons ?? []).filter((l) => l.source !== 'SEED');

  return (
    <div className="space-y-5">
      <PageTitle
        actions={
          <Link to="/generator">
            <Button variant="secondary">✨ {t('nav.generator')}</Button>
          </Link>
        }
      >
        {t('lesson.title')}
      </PageTitle>

      {today && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t('lesson.today')}
          </h2>
          <LessonCard lesson={today} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('lesson.seedWeek')}
        </h2>
        <div className="space-y-2">
          {seedLessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </div>

      {ownLessons.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t('lesson.myLessons')}
          </h2>
          <div className="space-y-2">
            {ownLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
