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

/**
 * Распознавание английской речи через Web Speech API (STT).
 * Работает в Chrome (десктоп и Android). Возвращает финальный и
 * промежуточный транскрипты и длительность записи.
 */
export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAtRef = useRef<number>(0);
  const supported = sttSupported();

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setTranscript('');
    setInterim('');
    setSeconds(0);
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setTranscript(finalText.trim());
      setInterim(interimText.trim());
    };
    recognition.onend = () => {
      setListening(false);
      setSeconds(Math.round((Date.now() - startedAtRef.current) / 1000));
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    startedAtRef.current = Date.now();
    setListening(true);
    recognition.start();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setSeconds(0);
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, transcript, interim, seconds, start, stop, reset };
}
