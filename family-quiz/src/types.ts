export type TeamKey = 'boys' | 'girls';

export interface TeamScores {
  boys: number;
  girls: number;
}

/**
 * Вопрос с вариантами (options + correctIndex) или открытый вопрос
 * (только answer — команды записывают ответ на бумаге).
 */
export interface Question {
  text: string;
  /** Короткая рубрика/заголовок вопроса («Кино», «Женская интуиция»…). */
  category?: string;
  options?: string[];
  /** Отсутствует у шуточных вопросов без правильного варианта — тогда показывается только answer. */
  correctIndex?: number;
  answer?: string;
  /** Интересный факт — показывается вместе с правильным ответом. */
  fact?: string;
}

export interface McqRound {
  type: 'mcq';
  title: string;
  description: string;
  rules: string[];
  timerSeconds?: number;
  pointsPerCorrect: number;
  questions: Question[];
}

export interface ImagesQuestion {
  text?: string;
  images: string[];
  answer: string;
  fact?: string;
}

export interface ImagesRound {
  type: 'images';
  title: string;
  description: string;
  rules: string[];
  pointsPerCorrect: number;
  questions: ImagesQuestion[];
}

export interface BlackBoxItem {
  hints: string[];
  answer: string;
  points: number;
}

export interface BlackBoxRound {
  type: 'blackbox';
  title: string;
  description: string;
  rules: string[];
  items: BlackBoxItem[];
}

export interface BattleBlock {
  team: TeamKey;
  title: string;
  questions: Question[];
}

export interface BattleRound {
  type: 'battle';
  title: string;
  description: string;
  rules: string[];
  timerSeconds?: number;
  pointsPerCorrect: number;
  blocks: BattleBlock[];
}

export interface FinalQuestion {
  text: string;
  answer: string;
  fact?: string;
}

export interface FinalRound {
  type: 'final';
  title: string;
  description: string;
  rules: string[];
  bets: number[];
  questions: FinalQuestion[];
}

export type Round = McqRound | ImagesRound | BlackBoxRound | BattleRound | FinalRound;

export interface QuizData {
  title: string;
  teams: Record<TeamKey, string>;
  rounds: Round[];
}

export type Screen = 'home' | 'round' | 'standings' | 'final';

export interface GameState {
  screen: Screen;
  currentRound: number;
  scores: TeamScores;
  /** Результаты по завершённым турам (дельта очков за тур), null — тур не сыгран. */
  roundResults: (TeamScores | null)[];
}
