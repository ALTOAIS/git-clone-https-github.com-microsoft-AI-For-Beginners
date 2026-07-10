import type { QuizData, TeamScores } from '../types';

interface StandingsProps {
  quiz: QuizData;
  scores: TeamScores;
  roundResults: (TeamScores | null)[];
  isLastRound: boolean;
  onNext: () => void;
}

/** Промежуточная таблица результатов после тура. */
export function Standings({ quiz, scores, roundResults, isLastRound, onNext }: StandingsProps) {
  const leader =
    scores.boys === scores.girls ? null : scores.boys > scores.girls ? quiz.teams.boys : quiz.teams.girls;

  return (
    <div className="screen standings-screen">
      <h1 className="section-title">Таблица результатов</h1>
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
              <tr key={i} className={result ? '' : 'standings-pending'}>
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
      <p className="standings-leader">{leader ? `Впереди — ${leader}! 🔥` : 'Ничья! Всё решится дальше 🤝'}</p>
      <div className="host-controls">
        <button className="btn btn-primary btn-xl" onClick={onNext}>
          {isLastRound ? 'Показать итоги' : 'Следующий тур'}
        </button>
      </div>
    </div>
  );
}
