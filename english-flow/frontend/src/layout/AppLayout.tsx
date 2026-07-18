import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useOnline } from '../lib/offline';
import { cx, levelLabel } from '../components/ui';

const mainNav = [
  { to: '/', key: 'today', icon: '☀️' },
  { to: '/lessons', key: 'lesson', icon: '📖' },
  { to: '/speaking', key: 'speaking', icon: '🎙️' },
  { to: '/review', key: 'review', icon: '🔁' },
] as const;

const secondaryNav = [
  { to: '/phrases', key: 'phrases', icon: '💬' },
  { to: '/errors', key: 'errors', icon: '✏️' },
  { to: '/grammar', key: 'grammar', icon: '📚' },
  { to: '/progress', key: 'progress', icon: '📈' },
  { to: '/settings', key: 'settings', icon: '⚙️' },
] as const;

function SidebarLink({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
          isActive
            ? 'bg-brand-800 text-white'
            : 'text-slate-300 hover:bg-navy-800 hover:text-white',
        )
      }
    >
      <span aria-hidden>{icon}</span>
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh md:flex">
      {/* Десктоп: боковая панель */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-navy-900 text-white md:fixed md:inset-y-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-800">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div>
            <div className="font-bold leading-tight">{t('app.name')}</div>
            <div className="text-xs text-slate-400">
              {t('today.level')}: {levelLabel(user?.currentLevel ?? 'A2')}
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {mainNav.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={t(`nav.${item.key}`)}
            />
          ))}
          <div className="pt-3 pb-1 px-3 text-xs uppercase tracking-wide text-slate-500">
            {t('nav.more')}
          </div>
          {secondaryNav.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={t(`nav.${item.key}`)}
            />
          ))}
        </nav>
        <div className="border-t border-navy-800 px-5 py-4 text-sm">
          <div className="font-medium">{user?.name}</div>
          <div className="text-slate-400">
            🔥 {user?.streakDays ?? 0} {t('nav.streak')}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-2 text-slate-400 hover:text-white cursor-pointer"
          >
            {t('app.logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 flex flex-col min-h-dvh">
        {!online && (
          <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
            {t('app.offline')}
          </div>
        )}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Мобайл: нижняя навигация */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden pb-[env(safe-area-inset-bottom)]">
        {[...mainNav, { to: '/more', key: 'more', icon: '☰' } as const].map(
          (item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  isActive ? 'text-brand-800' : 'text-slate-500',
                )
              }
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.icon}
              </span>
              {t(`nav.${item.key}`)}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
