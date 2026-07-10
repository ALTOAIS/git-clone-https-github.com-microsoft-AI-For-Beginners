import { useMemo } from 'react';
import type { QuizData, TeamScores } from '../types';

interface FinalResultsProps {
  quiz: QuizData;
  scores: TeamScores;
  roundResults: (TeamScores | null)[];
  onNewGame: () => void;
}

const CONFETTI_COLORS = ['#ffcc33', '#ff5fa2', '#4da3ff', '#5ee08a', '#ff8c42', '#c58bff'];

/** Итоговый экран: таблица, победитель и анимация победы. */
export function FinalResults({ quiz, scores, roundResults, onNewGame }: FinalResultsProps) {
  const tie = scores.boys === scores.girls;
  const winner = scores.boys > scores.girls ? quiz.teams.boys : quiz.teams.girls;

  const confetti = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDelay: `${Math.random() * 4}s`,
        animationDuration: `${3 + Math.random() * 3}s`,
      })),
    [],
  );

  return (
    <div className="screen final-screen">
      <div className="confetti" aria-hidden="true">
        {confetti.map((style, i) => (
          <span key={i} className="confetti-piece" style={style} />
        ))}
      </div>

      <h1 className="final-title">{tie ? '🤝 Ничья!' : '🏆 Победитель'}</h1>
      {!tie && <div className="final-winner">{winner}</div>}
      {tie && <div className="final-winner">Победила дружба!</div>}

      <table className="standings-table">
        <thead>
          <tr>
            <th>Тур</th>
            <th className="team-boys">{quiz.teams.boys}</th>
            <th className="team-girls">{quiz.teams.girls}</th>
          </tr>
        </thead>
        <tbody>
          {quiz.rounds.map((round, i) => {
            const result = roundResults[i];
            return (
              <tr key={i}>
                <td>{round.title}</td>
                <td>{result ? result.boys : '—'}</td>
                <td>{result ? result.girls : '—'}</td>
              </tr>
            );
          })}
          <tr className="standings-total">
            <td>Итого</td>
            <td className="team-boys">{scores.boys}</td>
            <td className="team-girls">{scores.girls}</td>
          </tr>
        </tbody>
      </table>

      <div className="host-controls">
        <button className="btn btn-primary btn-xl" onClick={onNewGame}>
          Новая игра
        </button>
      </div>
    </div>
  );
}
