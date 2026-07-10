import { useState } from 'react';
import type { TeamKey, TeamScores } from '../types';

interface ScoreEntryProps {
  teams: Record<TeamKey, string>;
  /** Какие команды получают результат в этом туре. */
  teamsToScore: TeamKey[];
  /** Максимум правильных ответов (число вопросов тура/блока). */
  maxCorrect: number;
  pointsPerCorrect: number;
  onSubmit: (delta: TeamScores) => void;
}

/** Экран ведущего: ввод числа правильных ответов каждой команды после тура. */
export function ScoreEntry({ teams, teamsToScore, maxCorrect, pointsPerCorrect, onSubmit }: ScoreEntryProps) {
  const [correct, setCorrect] = useState<TeamScores>({ boys: 0, girls: 0 });

  const change = (team: TeamKey, diff: number) => {
    setCorrect((prev) => ({
      ...prev,
      [team]: Math.min(maxCorrect, Math.max(0, prev[team] + diff)),
    }));
  };

  const submit = () => {
    onSubmit({
      boys: teamsToScore.includes('boys') ? correct.boys * pointsPerCorrect : 0,
      girls: teamsToScore.includes('girls') ? correct.girls * pointsPerCorrect : 0,
    });
  };

  return (
    <div className="score-entry">
      <h2 className="section-title">Введите результаты</h2>
      <p className="score-entry-hint">
        Количество правильных ответов (максимум {maxCorrect}).
        {pointsPerCorrect > 1 && ` Каждый правильный ответ — ${pointsPerCorrect} балла.`}
      </p>
      {teamsToScore.map((team) => (
        <div key={team} className={`score-entry-row score-entry-${team}`}>
          <span className="score-entry-team">{teams[team]}</span>
          <div className="stepper">
            <button className="btn stepper-btn" onClick={() => change(team, -1)} aria-label="Минус">
              −
            </button>
            <span className="stepper-value">{correct[team]}</span>
            <button className="btn stepper-btn" onClick={() => change(team, 1)} aria-label="Плюс">
              +
            </button>
          </div>
          <span className="score-entry-points">+{correct[team] * pointsPerCorrect} балл(ов)</span>
        </div>
      ))}
      <button className="btn btn-primary" onClick={submit}>
        Подтвердить результаты
      </button>
    </div>
  );
}
