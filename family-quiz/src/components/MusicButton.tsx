import { useState } from 'react';
import { music } from '../audio/music';

/** Включение/выключение фоновой музыки. Звук стартует только по клику ведущего. */
export function MusicButton() {
  const [on, setOn] = useState(music.playing);

  const toggle = () => {
    if (music.playing) {
      music.stop();
      setOn(false);
    } else {
      music.start();
      setOn(true);
    }
  };

  return (
    <button
      className="btn btn-ghost music-btn"
      title={on ? 'Выключить музыку' : 'Включить музыку'}
      onClick={toggle}
    >
      {on ? '🎵' : '🔇'}
    </button>
  );
}
