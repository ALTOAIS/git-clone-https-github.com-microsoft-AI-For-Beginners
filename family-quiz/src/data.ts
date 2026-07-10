import rawData from './data/quiz_data.json';
import type { QuizData } from './types';

/**
 * Весь контент игры живёт в src/data/quiz_data.json.
 * Чтобы поменять вопросы, достаточно изменить только файл данных.
 */
export const quiz = rawData as unknown as QuizData;
