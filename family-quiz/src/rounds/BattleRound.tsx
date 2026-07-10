import { useState } from 'react';
import type { BattleRound as BattleRoundData, TeamKey, TeamScores } from '../types';
import { QuestionBlock } from '../components/QuestionBlock';
import { ScoreEntry } from '../components/ScoreEntry';

interface BattleRoundProps {
  round: BattleRoundData;
  teams: Record<TeamKey, string>;
  onComplete: (delta: TeamScores) => void;
}

/**
 * Тур 4 «Битва полов»: блок вопросов одной команде → её результат,
 * затем блок второй команде → её результат.
 */
export function BattleRound({ round, teams, onComplete }: BattleRoundProps) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [stage, setStage] = useState<'questions' | 'score'>('questions');
  const [delta, setDelta] = useState<TeamScores>({ boys: 0, girls: 0 });

  const block = round.blocks[blockIndex];
  const isLastBlock = blockIndex === round.blocks.length - 1;

  if (stage === 'questions') {
    return (
      <QuestionBlock
        blockTitle={block.title}
        questions={block.questions}
        timerSeconds={round.timerSeconds}
        onDone={() => setStage('score')}
      />
    );
  }

  return (
    <ScoreEntry
      teams={teams}
      teamsToScore={[block.team]}
      maxCorrect={block.questions.length}
      pointsPerCorrect={round.pointsPerCorrect}
      onSubmit={(blockDelta) => {
        const next: TeamScores = {
          boys: delta.boys + blockDelta.boys,
          girls: delta.girls + blockDelta.girls,
        };
        if (isLastBlock) {
          onComplete(next);
        } else {
          setDelta(next);
          setBlockIndex(blockIndex + 1);
          setStage('questions');
        }
      }}
    />
  );
}
