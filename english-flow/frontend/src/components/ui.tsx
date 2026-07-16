import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiMode, FallbackReason } from '../api/types';

export function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-800 text-white hover:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-500',
  secondary:
    'bg-white text-brand-800 border border-brand-300 hover:bg-brand-50 disabled:text-slate-400 disabled:border-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-200',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium transition-colors cursor-pointer disabled:cursor-not-allowed min-h-11',
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-2xl bg-white p-4 shadow-sm border border-slate-200',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200',
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200',
        props.className,
      )}
    />
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-brand-100 text-brand-800',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cx('h-2 w-full rounded-full bg-slate-200', className)}>
      <div
        className="h-2 rounded-full bg-brand-600 transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
      <span>{label ?? t('app.loading')}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
      {children}
    </div>
  );
}

/**
 * Явная пометка ответов ИИ, полученных не от реального провайдера.
 * Различает две причины: ИИ вообще не настроен (дев-режим) vs. провайдер
 * настроен, но временно недоступен (перегружен/сбой) — после исчерпания
 * автоматических повторов на транспортном уровне.
 */
export function AiModeBadge({
  mode,
  fallbackReason,
}: {
  mode?: AiMode;
  fallbackReason?: FallbackReason;
}) {
  const { t } = useTranslation();
  if (mode !== 'fallback') return null;
  const overloaded = fallbackReason === 'llm_error';
  return (
    <span
      title={t(overloaded ? 'app.aiOverloadedHint' : 'app.aiFallbackHint')}
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
    >
      ⚠︎ {t(overloaded ? 'app.aiOverloaded' : 'app.aiFallback')}
    </span>
  );
}

export function PageTitle({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{children}</h1>
      {actions}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function levelLabel(level: string): string {
  return level.replace('_PLUS', '+');
}
