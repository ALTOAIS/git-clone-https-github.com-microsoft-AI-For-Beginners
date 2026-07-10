import type { TeamKey, TeamScores } from '../types';

interface ScoreboardProps {
  teams: Record<TeamKey, string>;
  scores: TeamScores;
  size?: 'compact' | 'large';
}

export function Scoreboard({ teams, scores, size = 'compact' }: ScoreboardProps) {
  return (
    <div className={`scoreboard scoreboard-${size}`}>
      <div className="scoreboard-team scoreboard-boys">
        <span className="scoreboard-name">{teams.boys}</span>
        <span className="scoreboard-score">{scores.boys}</span>
      </div>
      <span className="scoreboard-divider">:</span>
      <div className="scoreboard-team scoreboard-girls">
        <span className="scoreboard-score">{scores.girls}</span>
        <span className="scoreboard-name">{teams.girls}</span>
      </div>
    </div>
  );
}
