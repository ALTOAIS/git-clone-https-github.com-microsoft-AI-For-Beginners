import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Textarea, cx } from './ui';
import { useSpeechRecognition } from '../lib/voice';

/**
 * Голосовой ввод с честными статусами микрофона, накоплением транскрипта,
 * ручным редактированием распознанного текста и повторной записью.
 * Не теряет ответ при случайном завершении распознавания.
 */
export function VoiceRecorder({
  onSubmit,
  submitting,
  submitLabel,
}: {
  onSubmit: (transcript: string, seconds: number) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const { t } = useTranslation();
  const stt = useSpeechRecognition();
  const [edited, setEdited] = useState('');

  // Подхватываем финальный транскрипт в редактируемое поле после остановки.
  useEffect(() => {
    if (stt.status === 'done' && stt.transcript) {
      setEdited(stt.transcript);
    }
  }, [stt.status, stt.transcript]);

  if (!stt.supported) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-amber-700">{t('voice.unsupported')}</p>
        <Textarea
          rows={2}
          value={edited}
          onChange={(e) => setEdited(e.target.value)}
          placeholder={t('voice.recognized')}
        />
        <Button
          disabled={!edited.trim() || submitting}
          onClick={() => onSubmit(edited.trim(), 0)}
        >
          {submitLabel ?? t('voice.submit')}
        </Button>
      </div>
    );
  }

  const statusText = {
    idle: t('voice.status_idle'),
    listening: t('voice.status_listening'),
    processing: t('voice.status_processing'),
    done: t('voice.status_done'),
    error: t('voice.status_error'),
  }[stt.status];

  const statusColor = {
    idle: 'text-slate-500',
    listening: 'text-red-600',
    processing: 'text-amber-600',
    done: 'text-emerald-700',
    error: 'text-red-700',
  }[stt.status];

  const showEditor = stt.status === 'done' || edited.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cx(
            'inline-block h-2.5 w-2.5 rounded-full',
            stt.status === 'listening'
              ? 'bg-red-500 animate-pulse'
              : stt.status === 'error'
                ? 'bg-red-500'
                : stt.status === 'done'
                  ? 'bg-emerald-500'
                  : 'bg-slate-300',
          )}
        />
        <span className={statusColor}>{statusText}</span>
      </div>

      {stt.status === 'error' && stt.errorKind === 'not-allowed' && (
        <p className="text-sm text-red-700">{t('voice.permissionDenied')}</p>
      )}
      {stt.errorKind === 'no-speech' && stt.status !== 'error' && (
        <p className="text-sm text-amber-700">{t('voice.noSpeech')}</p>
      )}

      {/* Live transcript во время записи */}
      {stt.status === 'listening' && (
        <div className="rounded-xl bg-slate-50 p-3 text-slate-700 min-h-11">
          {stt.transcript} <span className="text-slate-400">{stt.interim}</span>
        </div>
      )}

      {/* Редактируемый распознанный текст после остановки */}
      {showEditor && stt.status !== 'listening' && (
        <div>
          <div className="mb-1 text-xs text-slate-400">{t('voice.editHint')}</div>
          <Textarea
            rows={2}
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {stt.status === 'listening' ? (
          <Button variant="danger" onClick={stt.stop}>
            ⏹ {t('voice.stop')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setEdited('');
              stt.reset();
              stt.start();
            }}
          >
            🎙️ {stt.status === 'idle' ? t('voice.start') : t('voice.rerecord')}
          </Button>
        )}
        {showEditor && stt.status !== 'listening' && (
          <Button
            disabled={!edited.trim() || submitting}
            onClick={() => onSubmit(edited.trim(), stt.seconds)}
          >
            {submitLabel ?? t('voice.submit')}
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-400">{t('voice.clarityNote')}</p>
    </div>
  );
}
