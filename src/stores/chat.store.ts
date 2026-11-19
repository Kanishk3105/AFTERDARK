import { create } from 'zustand';
import { db } from '@/data/db';
import { seal } from '@/security/crypto';
import { publish } from '@/services/channel';
import { expiresAt as mediaExpiresAt } from '@/services/mediaExpiry';
import { ChatMessage, MediaExpiry, MessageType } from '@/types';

interface SendParams {
  senderId: string;
  senderName: string;
  content: string;
  type?: MessageType;
  mediaExpiry?: MediaExpiry;
  replyToId?: string;
  blob?: Blob;
  mime?: string;
  previewLabel?: string;
  roomCode?: string;
}

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  hydrated: boolean;
  sendMessage: (params: SendParams) => Promise<ChatMessage>;
  receiveMessage: (message: ChatMessage) => Promise<void>;
  addReaction: (messageId: string, emoji: string, playerId: string) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  markRead: () => void;
  markViewed: (messageId: string) => Promise<void>;
  expireMessage: (messageId: string) => Promise<void>;
  clearUnread: () => void;
  clearAllMessages: () => Promise<void>;
  setMessages: (messages: ChatMessage[]) => void;
}

const welcome = (): ChatMessage => ({
  id: 'welcome-msg-1',
  roomId: 'local-room',
  senderId: 'system',
  senderName: 'AFTERDARK',
  type: 'system',
  content: 'Welcome to your private room. Messages sealed on this device stay between the two of you. Screenshot protection cannot be guaranteed.',
  encryption: 'plaintext',
  reactions: {},
  status: 'read',
  createdAt: new Date().toISOString(),
  deleted: false,
});

async function persist(message: ChatMessage) {
  await db.messages.put(message);
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [welcome()],
  unreadCount: 0,
  hydrated: false,

  setMessages: (messages) => set({ messages, hydrated: true }),

  sendMessage: async ({
    senderId,
    senderName,
    content,
    type = 'text',
    mediaExpiry,
    replyToId,
    blob,
    mime,
    previewLabel,
    roomCode,
  }) => {
    let encryption: ChatMessage['encryption'] = 'plaintext';
    let sealedContent: string | undefined;
    let storedContent = content;
    if (type !== 'system') {
      try {
        sealedContent = await seal(content);
        storedContent = '';
        encryption = 'aes-gcm';
      } catch {
        encryption = 'unavailable';
      }
    }

    let mediaId: string | undefined;
    if (blob) {
      mediaId = crypto.randomUUID();
      await db.media.put({
        id: mediaId,
        blob,
        mime: mime || blob.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
      });
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: 'local-room',
      senderId,
      senderName,
      type,
      content: storedContent,
      sealedContent,
      encryption,
      mediaId,
      mediaMime: mime,
      mediaExpiry,
      previewLabel,
      replyToId,
      expiresAt: mediaExpiry ? mediaExpiresAt(mediaExpiry) : undefined,
      reactions: {},
      status: 'sent',
      createdAt: new Date().toISOString(),
      deleted: false,
    };

    set((state) => ({ messages: [...state.messages, message] }));
    await persist(message);
    if (roomCode) {
      publish({ roomCode, senderId, type: 'chat', payload: message });
    }
    window.setTimeout(() => {
      set((state) => ({
        messages: state.messages.map((item) =>
          item.id === message.id && item.status === 'sent' ? { ...item, status: 'delivered' } : item,
        ),
      }));
    }, 350);
    return message;
  },

  receiveMessage: async (message) => {
    if (get().messages.some((item) => item.id === message.id)) return;
    const incoming = { ...message, status: 'delivered' as const };
    set((state) => ({ messages: [...state.messages, incoming], unreadCount: state.unreadCount + 1 }));
    await persist(incoming);
  },

  addReaction: (messageId, emoji, playerId) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, reactions: { ...msg.reactions, [emoji]: playerId } } : msg,
      ),
    }));
    const updated = get().messages.find((msg) => msg.id === messageId);
    if (updated) void persist(updated);
  },

  deleteMessage: async (messageId) => {
    const current = get().messages.find((msg) => msg.id === messageId);
    if (current?.mediaId) {
      await db.media.delete(current.mediaId);
    }
    const updated: ChatMessage = {
      ...(current as ChatMessage),
      deleted: true,
      content: 'This message was removed from this room',
      sealedContent: undefined,
      mediaId: undefined,
      encryption: 'plaintext',
    };
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === messageId ? updated : msg)),
    }));
    await persist(updated);
  },

  markRead: () => {
    set((state) => ({
      unreadCount: 0,
      messages: state.messages.map((msg) =>
        msg.status === 'sent' || msg.status === 'delivered' ? { ...msg, status: 'read' } : msg,
      ),
    }));
  },

  markViewed: async (messageId) => {
    const current = get().messages.find((msg) => msg.id === messageId);
    if (!current) return;
    const isViewOnce = current.mediaExpiry === 'view-once';
    if (isViewOnce) {
      await get().deleteMessage(messageId);
      return;
    }
    const updated = { ...current, viewed: true };
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === messageId ? updated : msg)),
    }));
    await persist(updated);
  },

  expireMessage: async (messageId) => {
    await get().deleteMessage(messageId);
  },

  clearUnread: () => set({ unreadCount: 0 }),

  clearAllMessages: async () => {
    await db.messages.clear();
    await db.media.clear();
    const fresh = welcome();
    await persist(fresh);
    set({ messages: [fresh], unreadCount: 0 });
  },
}));
