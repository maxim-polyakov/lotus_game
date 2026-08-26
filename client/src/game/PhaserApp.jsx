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
    window.addEventListener('resize', refreshScale);
    window.addEventListener('orientationchange', refreshScale);

    return () => {
      window.removeEventListener('resize', refreshScale);
      window.removeEventListener('orientationchange', refreshScale);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} id="lotus-game-root" />;
}
