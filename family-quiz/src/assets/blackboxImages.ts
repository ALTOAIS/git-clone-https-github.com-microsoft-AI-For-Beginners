import pacifier from './images/blackbox/pacifier.png';
import lightbulb from './images/blackbox/lightbulb.png';
import stamp from './images/blackbox/stamp.png';
import chessPiece from './images/blackbox/chess-piece.png';
import money from './images/blackbox/money.png';

/**
 * Изображения тура «Чёрный ящик» импортируются как модули, поэтому Vite
 * встраивает их в итоговую сборку (vite-plugin-singlefile — как base64
 * прямо в единственный index.html). В quiz_data.json указывается только
 * имя файла (поле `image`), а не путь — это и есть ключ этой карты.
 * Временные заглушки, пока не появятся настоящие фотографии предметов.
 */
export const blackboxImages: Record<string, string> = {
  'pacifier.png': pacifier,
  'lightbulb.png': lightbulb,
  'stamp.png': stamp,
  'chess-piece.png': chessPiece,
  'money.png': money,
};
