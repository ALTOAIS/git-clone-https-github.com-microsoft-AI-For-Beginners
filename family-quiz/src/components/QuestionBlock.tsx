import { useState } from 'react';
import type { Question } from '../types';
import { Timer } from './Timer';

const OPTION_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

interface QuestionBlockProps {
  blockTitle?: string;
  questions: Question[];
  timerSeconds?: number;
  onDone: () => void;
}

/**
 * Универсальный блок вопросов: сначала все вопросы по одному,
 * затем — все правильные ответы (Тур 1 и блоки Тура 4).
 */
export function QuestionBlock({ blockTitle, questions, timerSeconds, onDone }: QuestionBlockProps) {
  const [stage, setStage] = useState<'ask' | 'reveal'>('ask');
  const [index, setIndex] = useState(0);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const next = () => {
    if (!isLast) {
      setIndex(index + 1);
    } else if (stage === 'ask') {
      setStage('reveal');
      setIndex(0);
    } else {
      onDone();
    }
  };

  // Назад: к предыдущему вопросу/ответу; с первого ответа — к последнему вопросу
  const canBack = index > 0 || stage === 'reveal';
  const back = () => {
    if (index > 0) {
      setIndex(index - 1);
    } else if (stage === 'reveal') {
      setStage('ask');
      setIndex(questions.length - 1);
    }
  };

  return (
    <div className="question-block">
      {blockTitle && <div className="block-title">{blockTitle}</div>}
      <div className="question-counter">
        {stage === 'ask' ? 'Вопрос' : 'Ответ'} {index + 1} из {questions.length}
      </div>
      {question.category && <div className="question-category">{question.category}</div>}
      <h2 className="question-text">{question.text}</h2>

      {question.options ? (
        <div className="options-grid">
          {question.options.map((option, i) => {
            const correct = stage === 'reveal' && i === question.correctIndex;
            return (
              <div key={i} className={`option ${correct ? 'option-correct' : ''}`}>
                <span className="option-letter">{OPTION_LETTERS[i]}</span>
                <span className="option-text">{option}</span>
              </div>
            );
          })}
        </div>
      ) : (
        stage === 'ask' && <p className="open-question-hint">Запишите ответ на бумаге ✍️</p>
      )}

      {stage === 'reveal' && question.answer && (question.correctIndex === undefined || !question.options) && (
        <div className="answer-banner">
          {question.correctIndex === undefined && question.options ? question.answer : `Правильный ответ: ${question.answer}`}
        </div>
      )}

      {stage === 'reveal' && question.fact && <p className="question-fact">💡 {question.fact}</p>}

      {stage === 'ask' && timerSeconds && <Timer seconds={timerSeconds} resetKey={index} />}

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
              ? 'Завершить'
              : 'Следующий ответ'}
        </button>
      </div>
    </div>
  );
}
