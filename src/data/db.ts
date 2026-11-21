import Dexie, { type Table } from 'dexie';
import type { ChatMessage, ContentCard, ContentRating, IntensityLevel, MoodId } from '@/types';

export type EncounterStatus = 'reserved' | 'shown' | 'completed' | 'passed';

export interface MediaRecord {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: string;
  encrypted?: boolean;
}

export interface HistoryRecord {
  id: string;
  fingerprint: string;
  gameId: string;
  seenAt: string;
  moodId?: MoodId;
  intensity?: IntensityLevel;
  contentRating?: ContentRating;
  sessionId?: string;
  status?: EncounterStatus;
  normalizedText?: string;
  similarityGroup?: string;
  contentVersion?: string;
  selectionId?: string;
  batchId?: string;
  selectionIndex?: number;
  cardSnapshot?: ContentCard;
}

class AfterdarkDB extends Dexie {
  messages!: Table<ChatMessage, string>;
  media!: Table<MediaRecord, string>;
  history!: Table<HistoryRecord, string>;

  constructor() {
    super('afterdark');
    this.version(1).stores({
      messages: 'id, roomId, createdAt',
      media: 'id, createdAt',
      history: 'id, gameId, seenAt',
    });
    this.version(2).stores({
      history: 'id, fingerprint, gameId, moodId, intensity, sessionId, seenAt, status, similarityGroup, selectionId, batchId',
    });
  }
}

export const db = new AfterdarkDB();
