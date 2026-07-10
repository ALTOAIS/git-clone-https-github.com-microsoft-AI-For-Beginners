import type { QuizData } from '../types';

interface HomeScreenProps {
  quiz: QuizData;
  hasSavedGame: boolean;
  onStart: () => void;
  onContinue: () => void;
  onReset: () => void;
}

export function HomeScreen({ quiz, hasSavedGame, onStart, onContinue, onReset }: HomeScreenProps) {
  return (
    <div className="screen home-screen">
      <h1 className="home-title">{quiz.title}</h1>
      <p className="home-subtitle">
        {quiz.teams.boys} 🆚 {quiz.teams.girls}
      </p>
      <div className="home-rounds">
        {quiz.rounds.map((round, i) => (
          <div key={i} className="home-round-chip">
            {round.title}
          </div>
        ))}
      </div>
      <div className="home-actions">
        {hasSavedGame ? (
          <>
            <button className="btn btn-primary btn-xl" onClick={onContinue}>
              Продолжить игру
            </button>
            <button className="btn btn-ghost" onClick={onReset}>
              Начать заново
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-xl" onClick={onStart}>
            Начать игру
          </button>
        )}
      </div>
    </div>
  );
}
