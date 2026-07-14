import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Input } from '../components/ui';

const schema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  name: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError('');
    try {
      const user =
        mode === 'login'
          ? await login(values.email, values.password)
          : await registerUser(
              values.email,
              values.password,
              values.name?.trim() || values.email.split('@')[0],
            );
      navigate(user.onboardingCompleted ? '/' : '/onboarding');
    } catch (e: any) {
      setError(e.message ?? 'Ошибка');
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-900 px-4">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <img
            src="/icons/icon-192.png"
            alt=""
            className="mx-auto h-14 w-14 rounded-2xl"
          />
          <h1 className="mt-3 text-xl font-bold">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          <p className="text-sm text-slate-500">{t('app.subtitle')}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('auth.name')}
              </label>
              <Input {...register('name')} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('auth.email')}
            </label>
            <Input type="email" {...register('email')} autoComplete="email" />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('auth.password')}
            </label>
            <Input
              type="password"
              {...register('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <p className="mt-1 text-xs text-slate-400">{t('auth.passwordHint')}</p>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </Button>
        </form>
        <button
          className="w-full text-center text-sm text-brand-700 hover:underline cursor-pointer"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
        </button>
      </Card>
    </div>
  );
}
