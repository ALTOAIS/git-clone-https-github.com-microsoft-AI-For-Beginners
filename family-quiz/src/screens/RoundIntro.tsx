import type { Round } from '../types';

interface RoundIntroProps {
  round: Round;
  onStart: () => void;
}

export function RoundIntro({ round, onStart }: RoundIntroProps) {
  return (
    <div className="round-intro">
      <h1 className="round-intro-title">{round.title}</h1>
      <p className="round-intro-description">{round.description}</p>
      <ul className="round-intro-rules">
        {round.rules.map((rule, i) => (
          <li key={i}>{rule}</li>
        ))}
      </ul>
      <div className="host-controls">
        <button className="btn btn-primary btn-xl" onClick={onStart}>
          Начать тур
        </button>
      </div>
    </div>
  );
}
