interface QuizImageProps {
  src: string;
}

const IMAGE_PATTERN = /^(https?:|data:|\.{0,2}\/)|\.(png|jpe?g|gif|webp|svg)$/i;

/**
 * Карточка «картинки» для тура «Где логика?».
 * Поддерживает и файлы изображений, и эмодзи — контент задаётся в quiz_data.json.
 */
export function QuizImage({ src }: QuizImageProps) {
  return (
    <div className="quiz-image">
      {IMAGE_PATTERN.test(src) ? <img src={src} alt="Картинка вопроса" /> : <span className="quiz-image-emoji">{src}</span>}
    </div>
  );
}
