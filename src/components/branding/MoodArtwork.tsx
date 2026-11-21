import React from 'react';
import type { MoodId } from '@/config/app.config';

interface MoodArtworkProps {
  mood: MoodId;
  className?: string;
}

export const MoodArtwork: React.FC<MoodArtworkProps> = ({ mood, className = '' }) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 400 240"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
  >
    <path
      d="M191 258V137c0-52 34-88 82-88s82 36 82 88v121"
      stroke="#D5AA6D"
      strokeOpacity=".22"
      strokeWidth="1.5"
    />
    <path
      d="M209 258V143c0-40 26-67 64-67s64 27 64 67v115"
      fill="#8B1732"
      fillOpacity=".12"
    />
    <ellipse cx="288" cy="205" rx="100" ry="20" fill="#0B0508" fillOpacity=".44" />

    {mood === 'platonic' && (
      <g stroke="#F5E9EC" strokeOpacity=".82" strokeWidth="2">
        <circle cx="267" cy="137" r="44" />
        <circle cx="319" cy="137" r="44" />
        <path d="M221 86h9m-4.5-4.5v9M351 93h7m-3.5-3.5v7" stroke="#D5AA6D" />
        <circle cx="291" cy="137" r="2" fill="#D5AA6D" stroke="none" />
      </g>
    )}

    {mood === 'romantic' && (
      <g stroke="#D5AA6D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M285 198c-5-27 4-49 14-67 8-14 10-28 3-40 22 9 31 26 23 43 14-10 19-25 16-39 21 21 18 42 5 56 19-4 30-17 31-31 13 29 1 61-28 78-22 13-48 12-64 0Z" fill="#8B1732" fillOpacity=".55" />
        <path d="M305 206c-1-24 13-42 29-56m-25 43c-17-2-29-10-37-22m48 1c8-1 16-5 23-12" />
        <path d="M304 203c-8 22-19 35-33 42m39-36c14 13 28 17 45 14" />
        <path d="M278 243c-2-12 2-19 11-24m42 7c7 11 16 15 28 15" fill="#8B1732" fillOpacity=".4" />
        <circle cx="316" cy="122" r="4" fill="#D5AA6D" />
      </g>
    )}

    {mood === 'sexual' && (
      <g stroke="#D5AA6D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M284 202c-23-23-22-49 1-76 6-7 11-18 12-31 22 20 24 40 14 57 13-7 22-18 25-35 22 26 20 56-3 83-14 17-34 25-49 2Z" fill="#8B1732" fillOpacity=".62" />
        <path d="M300 202c-12-15-9-31 8-49 3-3 6-8 7-14 12 13 12 26 2 38-5 7-9 13-7 23" />
        <path d="M274 211c-16-2-29-10-38-22m92 15c12 3 23 1 34-5" />
        <circle cx="264" cy="102" r="3" fill="#D5AA6D" />
        <circle cx="345" cy="114" r="2" fill="#D5AA6D" />
      </g>
    )}

    {mood === 'fantasy' && (
      <g stroke="#D5AA6D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M235 125c17-17 37-25 59-25s42 8 59 25l-16 46c-3 9-14 12-22 6l-21-16-21 16c-8 6-19 3-22-6l-16-46Z" fill="#460B1B" fillOpacity=".8" />
        <path d="M250 129c13-8 26-8 39 0-13 12-26 12-39 0Zm49 0c13-8 26-8 39 0-13 12-26 12-39 0Z" fill="#0B0508" />
        <path d="M294 105v28m-4 0h8M210 89h10m-5-5v10m133-8h8m-4-4v8" />
        <path d="M278 177c7 8 13 13 16 24 3-11 9-16 16-24" />
      </g>
    )}
  </svg>
);
