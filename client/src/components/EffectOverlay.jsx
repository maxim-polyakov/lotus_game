import React, { useEffect, useRef } from 'react';

/**
 * Оверлей с эффектом (GIF или видео). Проигрывается при розыгрыше карты или атаке.
 */
export default function EffectOverlay({ url, onClose }) {
  const videoRef = useRef(null);
  const isGif = url?.toLowerCase().endsWith('.gif');

  useEffect(() => {
    if (!isGif && videoRef.current) {
      const v = videoRef.current;
      v.play().catch(() => {});
    }
  }, [url, isGif]);

  return (
    <div className="game-effect-overlay" onClick={onClose}>
      {isGif ? (
        <img key={url} src={url} alt="" />
      ) : (
        <video
          ref={videoRef}
          key={url}
          src={url}
          autoPlay
          muted
          playsInline
          onEnded={onClose}
        />
      )}
    </div>
  );
}
