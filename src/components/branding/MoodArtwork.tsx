import React from 'react';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';
import type { MoodId } from '@/types';

interface MoodArtworkProps {
  mood: MoodId;
  className?: string;
}

export const MoodArtwork: React.FC<MoodArtworkProps> = ({ mood, className = '' }) => (
  <img
    src={AFTERDARK_ASSETS.moods[mood]}
    alt=""
    aria-hidden="true"
    className={`object-cover ${className}`}
    loading="lazy"
    decoding="async"
  />
);
