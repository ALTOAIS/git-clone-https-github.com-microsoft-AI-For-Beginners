import { useState } from 'react';
import type { BlackBoxRound as BlackBoxRoundData, TeamKey, TeamScores } from '../types';

interface BlackBoxRoundProps {
  round: BlackBoxRoundData;
  teams: Record<TeamKey, string>;
  onComplete: (delta: TeamScores) => void;
}

/** Тур 3 «Чёрный ящик»: подсказки по одной → ответ → ведущий выбирает победителя. */
export function BlackBoxRound({ round, teams, onComplete }: BlackBoxRoundProps) {
  const [itemIndex, setItemIndex] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);
  const [delta, setDelta] = useState<TeamScores>({ boys: 0, girls: 0 });

  const item = round.items[itemIndex];
  const isLastItem = itemIndex === round.items.length - 1;
  const allHintsShown = hintsShown >= item.hints.length;

  const pickWinner = (team: TeamKey | null) => {
    const next: TeamScores = {
      boys: delta.boys + (team === 'boys' ? item.points : 0),
      girls: delta.girls + (team === 'girls' ? item.points : 0),
    };
    if (isLastItem) {
      onComplete(next);
    } else {
      setDelta(next);
      setItemIndex(itemIndex + 1);
      setHintsShown(0);
      setAnswerShown(false);
    }
  };

  return (
    <div className="question-block blackbox">
      {round.items.length > 1 && (
        <div className="question-counter">
          Чёрный ящик {itemIndex + 1} из {round.items.length}
        </div>
      )}

      <div className={`blackbox-box ${answerShown ? 'blackbox-open' : ''}`}>
        {answerShown ? <span className="blackbox-answer">{item.answer}</span> : <span className="blackbox-question">?</span>}
      </div>

      <div className="hints">
        {item.hints.slice(0, hintsShown).map((hint, i) => (
          <div key={i} className="hint">
            <span className="hint-number">Подсказка {i + 1}</span>
            {hint}
          </div>
        ))}
      </div>

      <div className="host-controls">
        {!allHintsShown && (
          <button className="btn btn-primary" onClick={() => setHintsShown(hintsShown + 1)}>
            Открыть подсказку
          </button>
        )}
        {allHintsShown && !answerShown && (
          <button className="btn btn-primary" onClick={() => setAnswerShown(true)}>
            Показать ответ
          </button>
        )}
        {answerShown && (
          <div className="winner-pick">
            <span className="winner-pick-label">Кто победил? (+{item.points} балла)</span>
            <div className="winner-pick-buttons">
              <button className="btn btn-boys" onClick={() => pickWinner('boys')}>
                {teams.boys}
              </button>
              <button className="btn btn-girls" onClick={() => pickWinner('girls')}>
                {teams.girls}
              </button>
              <button className="btn btn-ghost" onClick={() => pickWinner(null)}>
                Никто
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
