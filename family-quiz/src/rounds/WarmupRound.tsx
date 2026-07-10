import { useState } from 'react';
import type { McqRound, TeamKey, TeamScores } from '../types';
import { QuestionBlock } from '../components/QuestionBlock';
import { ScoreEntry } from '../components/ScoreEntry';

interface WarmupRoundProps {
  round: McqRound;
  teams: Record<TeamKey, string>;
  onComplete: (delta: TeamScores) => void;
}

/** Тур 1 «Разминка»: вопросы с вариантами → ответы → ввод результатов. */
export function WarmupRound({ round, teams, onComplete }: WarmupRoundProps) {
  const [stage, setStage] = useState<'questions' | 'score'>('questions');

  if (stage === 'questions') {
    return (
      <QuestionBlock
        questions={round.questions}
        timerSeconds={round.timerSeconds}
        onDone={() => setStage('score')}
      />
    );
  }

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
