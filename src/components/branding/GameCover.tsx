import React from 'react';
import { AFTERDARK_ASSETS, getGameCover } from '@/assets/afterdark';

interface GameCoverProps {
  gameId: string;
  alt?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export const GameCover: React.FC<GameCoverProps> = ({
  gameId,
  alt = '',
  className = '',
  loading = 'lazy',
}) => (
  <div className={`relative isolate overflow-hidden rounded-xl bg-ad-bg-secondary p-1 ${className}`}>
    <img
      src={AFTERDARK_ASSETS.ui.gameCardFrame}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-fill"
      loading="lazy"
      decoding="async"
    />
    <img
      src={getGameCover(gameId)}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className="relative z-10 h-full w-full rounded-md object-cover"
      loading={loading}
      decoding="async"
    />
  </div>
);
