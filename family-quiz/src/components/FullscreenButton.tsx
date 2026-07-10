import { useEffect, useState } from 'react';

export function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  return (
    <button className="btn btn-ghost fullscreen-btn" onClick={toggle}>
      {fullscreen ? '✕ Выйти из полного экрана' : '⛶ Во весь экран'}
    </button>
  );
}
