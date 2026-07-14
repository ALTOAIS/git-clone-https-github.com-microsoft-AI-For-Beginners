import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** Индикатор онлайн-статуса. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

const OUTBOX_KEY = 'ef_outbox';

interface OutboxItem {
  path: string;
  body: unknown;
  queuedAt: string;
}

function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(0, 200)));
}

/**
 * Офлайн-очередь: POST-запросы (ответы повторения), сделанные без сети,
 * сохраняются локально и отправляются при восстановлении соединения.
 */
export function enqueueOffline(path: string, body: unknown) {
  const items = readOutbox();
  items.push({ path, body, queuedAt: new Date().toISOString() });
  writeOutbox(items);
}

export function outboxSize(): number {
  return readOutbox().length;
}

let flushing = false;

export async function flushOutbox(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    let items = readOutbox();
    while (items.length > 0) {
      const item = items[0];
      try {
        await api.post(item.path, item.body);
        sent++;
      } catch (error: any) {
        // 4xx — запись некорректна, выбрасываем; сеть/5xx — прервать и повторить позже
        if (!(error?.status >= 400 && error.status < 500)) break;
      }
      items = items.slice(1);
      writeOutbox(items);
    }
  } finally {
    flushing = false;
  }
  return sent;
}

export function initOfflineSync() {
  window.addEventListener('online', () => void flushOutbox());
  void flushOutbox();
}

/** POST с офлайн-фолбэком: при отсутствии сети кладёт запрос в очередь. */
export async function postWithOfflineFallback<T>(
  path: string,
  body: unknown,
): Promise<{ result?: T; queued: boolean }> {
  if (!navigator.onLine) {
    enqueueOffline(path, body);
    return { queued: true };
  }
  try {
    const result = await api.post<T>(path, body);
    return { result, queued: false };
  } catch (error: any) {
    if (error?.status === undefined || error?.status === 0) {
      enqueueOffline(path, body);
      return { queued: true };
    }
    throw error;
  }
}
