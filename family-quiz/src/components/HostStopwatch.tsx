import { useEffect, useState } from 'react';

interface HostStopwatchProps {
  startedAt: number;
}

function format(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/**
 * Секундомер ведущего: идёт с начала игры, но на экране — только иконка ⏱.
 * Время показывается лишь по клику ведущего (например, для суперфинала).
 */
export function HostStopwatch({ startedAt }: HostStopwatchProps) {
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <button
      className="btn btn-ghost stopwatch-btn"
      title="Секундомер игры — время видно только по клику"
      onClick={() => {
        setNow(Date.now());
        setVisible((v) => !v);
      }}
    >
      ⏱{visible && <span className="stopwatch-time"> {format(elapsed)}</span>}
    </button>
  );
}
