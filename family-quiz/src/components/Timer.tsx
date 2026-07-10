import { useEffect, useState } from 'react';

interface TimerProps {
  seconds: number;
  /** При смене ключа (например, номера вопроса) таймер сбрасывается. */
  resetKey: string | number;
}

export function Timer({ seconds, resetKey }: TimerProps) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const expired = left === 0;
  const percent = (left / seconds) * 100;

  return (
    <div className={`timer ${expired ? 'timer-expired' : ''} ${running ? 'timer-running' : ''}`}>
      <div className="timer-value">{expired ? 'Время вышло!' : `${left} сек`}</div>
      <div className="timer-bar">
        <div className="timer-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      {!running && !expired && (
        <button className="btn" onClick={() => setRunning(true)}>
          ⏱ Запустить таймер
        </button>
      )}
      {running && (
        <button className="btn btn-ghost" onClick={() => setRunning(false)}>
          Пауза
        </button>
      )}
      {expired && (
        <button
          className="btn btn-ghost"
          onClick={() => {
            setLeft(seconds);
            setRunning(false);
          }}
        >
          Сбросить таймер
        </button>
      )}
    </div>
  );
}
