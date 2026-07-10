import { useState } from 'react';
import type { FinalRound as FinalRoundData, TeamKey, TeamScores } from '../types';

interface FinalRoundProps {
  round: FinalRoundData;
  teams: Record<TeamKey, string>;
  /** Счёт до начала финала — для живого табло внутри тура. */
  baseScores: TeamScores;
  onComplete: (delta: TeamScores) => void;
}

type Stage = 'bet' | 'question' | 'answer';

/**
 * Тур 5 «Финал: Ближе всех»: ставка → вопрос → ответ → победитель.
 * Победитель получает свою ставку, проигравший теряет свою.
 */
export function FinalRound({ round, teams, baseScores, onComplete }: FinalRoundProps) {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('bet');
  const [bets, setBets] = useState<Partial<TeamScores>>({});
  const [delta, setDelta] = useState<TeamScores>({ boys: 0, girls: 0 });

  const question = round.questions[index];
  const isLast = index === round.questions.length - 1;
  const betsPlaced = bets.boys !== undefined && bets.girls !== undefined;

  const live: TeamScores = {
    boys: baseScores.boys + delta.boys,
    girls: baseScores.girls + delta.girls,
  };

  const pickWinner = (winner: TeamKey | 'tie') => {
    const next = { ...delta };
    if (winner !== 'tie') {
      const loser: TeamKey = winner === 'boys' ? 'girls' : 'boys';
      next[winner] += bets[winner] ?? 0;
      next[loser] -= bets[loser] ?? 0;
    }
    if (isLast) {
      onComplete(next);
      return;
    }
    setDelta(next);
    setIndex(index + 1);
    setStage('bet');
    setBets({});
  };

  return (
    <div className="question-block final-round">
      <div className="final-live-score">
        <span className="team-boys">
          {teams.boys}: {live.boys}
        </span>
        <span className="team-girls">
          {teams.girls}: {live.girls}
        </span>
      </div>
      <div className="question-counter">
        Вопрос {index + 1} из {round.questions.length}
      </div>

      {stage === 'bet' && (
        <>
          <h2 className="question-text">Сделайте ставки!</h2>
          {(['boys', 'girls'] as TeamKey[]).map((team) => (
            <div key={team} className={`bet-row bet-${team}`}>
              <span className="bet-team">{teams[team]}</span>
              <div className="bet-buttons">
                {round.bets.map((value) => (
                  <button
                    key={value}
                    className={`btn bet-btn ${bets[team] === value ? 'bet-btn-active' : ''}`}
                    onClick={() => setBets({ ...bets, [team]: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="host-controls">
            <button className="btn btn-primary" disabled={!betsPlaced} onClick={() => setStage('question')}>
              Показать вопрос
            </button>
          </div>
        </>
      )}

      {stage === 'question' && (
        <>
          <h2 className="question-text">{question.text}</h2>
          <p className="open-question-hint">Запишите ответ на бумаге ✍️</p>
          <div className="bets-summary">
            Ставки — {teams.boys}: {bets.boys}, {teams.girls}: {bets.girls}
          </div>
          <div className="host-controls host-controls-row">
            <button className="btn btn-ghost" onClick={() => setStage('bet')}>
              ← К ставкам
            </button>
            <button className="btn btn-primary" onClick={() => setStage('answer')}>
              Показать ответ
            </button>
          </div>
        </>
      )}

      {stage === 'answer' && (
        <>
          <h2 className="question-text">{question.text}</h2>
          <div className="answer-banner">Правильный ответ: {question.answer}</div>
          {question.fact && <p className="question-fact">💡 {question.fact}</p>}
          <div className="winner-pick">
            <span className="winner-pick-label">Чей ответ ближе к правильному?</span>
            <div className="winner-pick-buttons">
              <button className="btn btn-boys" onClick={() => pickWinner('boys')}>
                {teams.boys} (+{bets.boys})
              </button>
              <button className="btn btn-girls" onClick={() => pickWinner('girls')}>
                {teams.girls} (+{bets.girls})
              </button>
              <button className="btn btn-ghost" onClick={() => pickWinner('tie')}>
                Ничья
              </button>
            </div>
            <button className="btn btn-ghost" onClick={() => setStage('question')}>
              ← Назад к вопросу
            </button>
          </div>
        </>
      )}
    </div>
  );
}
