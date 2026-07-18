import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';

const ITEMS = [
  { to: '/phrases', key: 'phrases', icon: '💬' },
  { to: '/errors', key: 'errors', icon: '✏️' },
  { to: '/grammar', key: 'grammar', icon: '📚' },
  { to: '/progress', key: 'progress', icon: '📈' },
  { to: '/translate', key: 'lesson', icon: '🔤', labelKey: 'translate.title' },
  { to: '/generator', key: 'generator', icon: '✨' },
  { to: '/materials', key: 'materials', icon: '📎' },
  { to: '/settings', key: 'settings', icon: '⚙️' },
] as const;

export default function MorePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-2xl" />
        <div>
          <div className="font-bold">{user?.name}</div>
          <div className="text-sm text-slate-500">
            🔥 {user?.streakDays ?? 0} {t('nav.streak')}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="flex h-full flex-col items-center gap-1 py-5 text-center hover:border-brand-400">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-medium">
                {'labelKey' in item ? t(item.labelKey) : t(`nav.${item.key}`)}
              </span>
            </Card>
          </Link>
        ))}
      </div>
      <button
        className="w-full rounded-xl border border-slate-300 bg-white py-3 text-slate-600 cursor-pointer hover:bg-slate-50"
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        {t('app.logout')}
      </button>
    </div>
  );
}
