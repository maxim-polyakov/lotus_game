import { useEffect, useRef } from 'react';
import { createLotusGame } from './runtime';

export default function PhaserApp() {
  const hostRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined;

    gameRef.current = createLotusGame(hostRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} id="lotus-game-root" />;
}
