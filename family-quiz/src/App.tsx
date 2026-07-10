import { useEffect, useState } from 'react';
import { quiz } from './data';
import { clearState, loadState, saveState } from './storage';
import type { GameState, Round, TeamKey, TeamScores } from './types';
import { Scoreboard } from './components/Scoreboard';
import { FullscreenButton } from './components/FullscreenButton';
import { HostStopwatch } from './components/HostStopwatch';
import { HomeScreen } from './screens/HomeScreen';
import { RoundIntro } from './screens/RoundIntro';
import { Standings } from './screens/Standings';
import { FinalResults } from './screens/FinalResults';
import { WarmupRound } from './rounds/WarmupRound';
import { LogicRound } from './rounds/LogicRound';
import { BlackBoxRound } from './rounds/BlackBoxRound';
import { BattleRound } from './rounds/BattleRound';
import { FinalRound } from './rounds/FinalRound';

function initialState(): GameState {
  return {
    screen: 'home',
    currentRound: 0,
    startedAt: null,
    scores: { boys: 0, girls: 0 },
    roundResults: quiz.rounds.map(() => null),
  };
}

interface RoundScreenProps {
  round: Round;
  teams: Record<TeamKey, string>;
  scores: TeamScores;
  onComplete: (delta: TeamScores) => void;
}

function RoundScreen({ round, teams, scores, onComplete }: RoundScreenProps) {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <RoundIntro round={round} onStart={() => setStarted(true)} />;
  }

  switch (round.type) {
    case 'mcq':
      return <WarmupRound round={round} teams={teams} onComplete={onComplete} />;
    case 'images':
      return <LogicRound round={round} teams={teams} onComplete={onComplete} />;
    case 'blackbox':
      return <BlackBoxRound round={round} teams={teams} onComplete={onComplete} />;
    case 'battle':
      return <BattleRound round={round} teams={teams} onComplete={onComplete} />;
    case 'final':
      return <FinalRound round={round} teams={teams} baseScores={scores} onComplete={onComplete} />;
  }
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState() ?? initialState());
  // При открытии всегда показываем главный экран: если есть сохранённая игра,
  // ведущий может продолжить её или начать заново.
  const [showHome, setShowHome] = useState(true);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const hasSavedGame = state.screen !== 'home';

  const startNewGame = () => {
    setState({ ...initialState(), screen: 'round', startedAt: Date.now() });
    setShowHome(false);
  };

  const completeRound = (delta: TeamScores) => {
    setState((s) => {
      const roundResults = s.roundResults.slice();
      roundResults[s.currentRound] = delta;
      return {
        ...s,
        roundResults,
        scores: { boys: s.scores.boys + delta.boys, girls: s.scores.girls + delta.girls },
        screen: 'standings',
      };
    });
  };

  const nextRound = () => {
    setState((s) =>
      s.currentRound + 1 < quiz.rounds.length
        ? { ...s, currentRound: s.currentRound + 1, screen: 'round' }
        : { ...s, screen: 'final' },
    );
  };

  const newGame = () => {
    clearState();
    setState(initialState());
    setShowHome(true);
  };

  if (showHome) {
    return (
      <div className="app">
        <div className="top-bar top-bar-home">
          <FullscreenButton />
        </div>
        <HomeScreen
          quiz={quiz}
          hasSavedGame={hasSavedGame}
          onStart={startNewGame}
          onContinue={() => setShowHome(false)}
          onReset={startNewGame}
        />
      </div>
    );
  }

  const round = quiz.rounds[state.currentRound];

  return (
    <div className="app">
      <div className="top-bar">
        <span className="top-bar-round">{state.screen === 'final' ? 'Итоги игры' : round.title}</span>
        <Scoreboard teams={quiz.teams} scores={state.scores} />
        <div className="top-bar-tools">
          {state.startedAt != null && <HostStopwatch startedAt={state.startedAt} />}
          <FullscreenButton />
        </div>
      </div>

      {state.screen === 'round' && (
        <RoundScreen
          key={state.currentRound}
          round={round}
          teams={quiz.teams}
          scores={state.scores}
          onComplete={completeRound}
        />
      )}

      {state.screen === 'standings' && (
        <Standings
          quiz={quiz}
          scores={state.scores}
          roundResults={state.roundResults}
          isLastRound={state.currentRound === quiz.rounds.length - 1}
          onNext={nextRound}
        />
      )}

      {state.screen === 'final' && (
        <FinalResults quiz={quiz} scores={state.scores} roundResults={state.roundResults} onNewGame={newGame} />
      )}
    </div>
  );
}
