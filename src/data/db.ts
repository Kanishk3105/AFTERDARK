import Dexie, { type Table } from 'dexie';
import type { ChatMessage } from '@/types';

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
  }
}

export const db = new AfterdarkDB();
