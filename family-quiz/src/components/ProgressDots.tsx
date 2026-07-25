interface ProgressDotsProps {
  /** Номер текущего вопроса, начиная с 1. */
  current: number;
  total: number;
}

/** Визуальный индикатор прогресса по вопросам тура — крупные точки, читаемые с экрана телевизора. */
export function ProgressDots({ current, total }: ProgressDotsProps) {
  if (total <= 1) return null;
  return (
    <div className="progress-dots" role="presentation">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`progress-dot ${i < current ? 'progress-dot-active' : ''}`} />
      ))}
    </div>
  );
}
