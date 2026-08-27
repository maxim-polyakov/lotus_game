import { useEffect, useRef } from 'react';
import { createLotusGame, refreshLotusGame } from './runtime';
import './PhaserApp.css';

export default function PhaserApp() {
  const hostRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;

    gameRef.current = createLotusGame(hostRef.current);
    const refreshScale = () => refreshLotusGame(gameRef.current);

    // First paint / mobile browser chrome can report wrong size until after layout.
    requestAnimationFrame(refreshScale);
    const bootTimer = window.setTimeout(refreshScale, 250);

    window.addEventListener('resize', refreshScale);
    window.addEventListener('orientationchange', refreshScale);
    window.visualViewport?.addEventListener('resize', refreshScale);
    window.visualViewport?.addEventListener('scroll', refreshScale);

    return () => {
      window.clearTimeout(bootTimer);
      window.removeEventListener('resize', refreshScale);
      window.removeEventListener('orientationchange', refreshScale);
      window.visualViewport?.removeEventListener('resize', refreshScale);
      window.visualViewport?.removeEventListener('scroll', refreshScale);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} id="lotus-game-root" />;
}
