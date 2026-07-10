import type { GameState } from './types';

const STORAGE_KEY = 'family-quiz-state-v1';

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    if (!state || typeof state.currentRound !== 'number' || !state.scores) return null;
    return state;
  } catch {
    return null;
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage может быть недоступен (приватный режим) — игра продолжится без сохранения
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
