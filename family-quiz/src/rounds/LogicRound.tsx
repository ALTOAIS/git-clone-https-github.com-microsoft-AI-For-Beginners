import { useState } from 'react';
import type { ImagesRound, TeamKey, TeamScores } from '../types';
import { QuizImage } from '../components/QuizImage';
import { ScoreEntry } from '../components/ScoreEntry';

interface LogicRoundProps {
  round: ImagesRound;
  teams: Record<TeamKey, string>;
  onComplete: (delta: TeamScores) => void;
}

/** Тур 2 «Где логика?»: три картинки на вопрос → ответы после тура → ввод результатов. */
export function LogicRound({ round, teams, onComplete }: LogicRoundProps) {
  const [stage, setStage] = useState<'ask' | 'reveal' | 'score'>('ask');
  const [index, setIndex] = useState(0);

  if (stage === 'score') {
    return (
      <ScoreEntry
        teams={teams}
        teamsToScore={['boys', 'girls']}
        maxCorrect={round.questions.length}
        pointsPerCorrect={round.pointsPerCorrect}
        onSubmit={onComplete}
      />
    );
  }

  const question = round.questions[index];
  const isLast = index === round.questions.length - 1;

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
    } else if (stage === 'ask') {
      setStage('reveal');
      setIndex(0);
    } else {
      setStage('score');
    }
  };

  const canBack = index > 0 || stage === 'reveal';
  const back = () => {
    if (index > 0) {
      setIndex(index - 1);
    } else if (stage === 'reveal') {
      setStage('ask');
      setIndex(round.questions.length - 1);
    }
  };

  return (
    <div className="question-block">
      <div className="question-counter">
        {stage === 'ask' ? 'Вопрос' : 'Ответ'} {index + 1} из {round.questions.length}
      </div>
      {question.text && <h2 className="question-text">{question.text}</h2>}
      <div className="images-row">
        {question.images.map((src, i) => (
          <QuizImage key={i} src={src} />
        ))}
      </div>
      {stage === 'reveal' && <div className="answer-banner">Правильный ответ: {question.answer}</div>}
      {stage === 'reveal' && question.fact && <p className="question-fact">💡 {question.fact}</p>}
      {stage === 'ask' && <p className="open-question-hint">Запишите ответ на бумаге ✍️</p>}
      <div className="host-controls host-controls-row">
        {canBack && (
          <button className="btn btn-ghost" onClick={back}>
            ← Назад
          </button>
        )}
        <button className="btn btn-primary" onClick={next}>
          {stage === 'ask'
            ? isLast
              ? 'Показать ответы'
              : 'Следующий вопрос'
            : isLast
              ? 'Ввести результаты'
              : 'Следующий ответ'}
        </button>
      </div>
    </div>
  );
}
