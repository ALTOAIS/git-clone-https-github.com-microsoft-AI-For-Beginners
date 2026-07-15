import { useCallback, useEffect, useRef, useState } from 'react';

/** Озвучивание английского текста через Web Speech API (TTS). */
export function speak(text: string, rate = 0.9) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const enVoice =
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en'));
  if (enVoice) utterance.voice = enVoice;
  window.speechSynthesis.speak(utterance);
}

export function ttsSupported(): boolean {
  return 'speechSynthesis' in window;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Явные статусы микрофона для честного UI. */
export type MicStatus =
  | 'idle' // готов
  | 'listening' // слушаю
  | 'processing' // обрабатываю (после стопа, до финала)
  | 'done' // запись завершена
  | 'error'; // ошибка

export type MicErrorKind =
  | 'not-allowed' // нет разрешения на микрофон
  | 'no-speech' // речь не распознана
  | 'unsupported' // браузер не поддерживает
  | 'other';

/**
 * Распознавание английской речи через Web Speech API (STT).
 *
 * Улучшения относительно наивной версии:
 *  - явные статусы микрофона (idle/listening/processing/done/error);
 *  - НЕ теряет начало/конец: финальные фрагменты аккумулируются, а короткая
 *    пауза (авто-onend Chrome) не завершает запись — распознавание
 *    перезапускается, пока пользователь не остановит вручную;
 *  - различает ошибку разрешения микрофона (not-allowed) и «нет речи»;
 *  - transcript можно отредактировать вручную (setTranscript) перед отправкой;
 *  - reset для повторной записи без потери предыдущего ответа до явного сброса.
 *
 * Работает в Chrome (desktop и Android). В неподдерживаемых браузерах
 * supported=false — вызывающий код показывает текстовый ввод.
 */
export function useSpeechRecognition() {
  const supported = sttSupported();
  const [status, setStatus] = useState<MicStatus>('idle');
  const [errorKind, setErrorKind] = useState<MicErrorKind | null>(null);
  const [transcript, setTranscriptState] = useState('');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(''); // аккумулированный финальный текст
  const manualStopRef = useRef(false); // пользователь остановил вручную
  const startedAtRef = useRef(0);
  const sawErrorRef = useRef(false);

  const listening = status === 'listening';

  const buildRecognition = useCallback((): SpeechRecognitionLike | null => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalRef.current = (finalRef.current + ' ' + text).trim();
        } else {
          interimText += text;
        }
      }
      setTranscriptState(finalRef.current);
      setInterim(interimText.trim());
    };

    recognition.onerror = (event: any) => {
      const err = event?.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        sawErrorRef.current = true;
        manualStopRef.current = true; // не перезапускать
        setErrorKind('not-allowed');
        setStatus('error');
      } else if (err === 'no-speech') {
        // короткая тишина — не считаем фатальной, onend перезапустит
        setErrorKind('no-speech');
      } else if (err === 'aborted') {
        // намеренная остановка — игнорируем
      } else {
        setErrorKind('other');
      }
    };

    recognition.onend = () => {
      // Chrome завершает распознавание по паузе. Если пользователь НЕ
      // останавливал вручную и не было фатальной ошибки — перезапускаем,
      // чтобы не потерять продолжение речи.
      if (!manualStopRef.current && !sawErrorRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* уже остановлено — падаем в финализацию */
        }
      }
      setInterim('');
      setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
      setTranscriptState(finalRef.current);
      setStatus((s) => (s === 'error' ? 'error' : 'done'));
    };

    return recognition;
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setErrorKind('unsupported');
      setStatus('error');
      return;
    }
    finalRef.current = '';
    manualStopRef.current = false;
    sawErrorRef.current = false;
    startedAtRef.current = Date.now();
    setTranscriptState('');
    setInterim('');
    setSeconds(0);
    setErrorKind(null);
    const recognition = buildRecognition();
    if (!recognition) {
      setErrorKind('unsupported');
      setStatus('error');
      return;
    }
    recognitionRef.current = recognition;
    setStatus('listening');
    try {
      recognition.start();
    } catch {
      // start() может бросить, если уже запущено — считаем это ok
    }
  }, [supported, buildRecognition]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    setStatus((s) => (s === 'listening' ? 'processing' : s));
    recognitionRef.current?.stop();
  }, []);

  /** Ручное редактирование распознанного текста перед отправкой на оценку. */
  const setTranscript = useCallback((value: string) => {
    finalRef.current = value;
    setTranscriptState(value);
  }, []);

  const reset = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.abort();
    finalRef.current = '';
    setTranscriptState('');
    setInterim('');
    setSeconds(0);
    setErrorKind(null);
    setStatus('idle');
  }, []);

  useEffect(
    () => () => {
      manualStopRef.current = true;
      recognitionRef.current?.abort();
    },
    [],
  );

  return {
    supported,
    status,
    listening,
    errorKind,
    transcript,
    interim,
    seconds,
    start,
    stop,
    reset,
    setTranscript,
  };
}
