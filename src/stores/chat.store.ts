import { create } from 'zustand';
import { db } from '@/data/db';
import { seal, sealBytes } from '@/security/crypto';
import { publish } from '@/services/channel';
import { expiresAt as mediaExpiresAt } from '@/services/mediaExpiry';
import {
  assertRemoteContentEnabled,
  getRemoteClient,
  notifyRemotePartner,
  uploadRemoteMedia,
} from '@/services/sync';
import { ensureRemoteIdentity } from '@/services/sync';
import { useAppStore } from '@/stores/app.store';
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
  content: 'Welcome to your private room. Text is sealed on this device before local storage. Screenshot protection cannot be guaranteed.',
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
    const activeRoomId = useAppStore.getState().roomId;
    if (roomCode && activeRoomId && !activeRoomId.startsWith('room-') && getRemoteClient()) {
      await assertRemoteContentEnabled(activeRoomId);
    }

    let encryption: ChatMessage['encryption'] = 'plaintext';
    let sealedContent: string | undefined;
    let storedContent = content;
    if (type !== 'system') {
      try {
        sealedContent = await seal(content);
        storedContent = '';
        encryption = 'aes-gcm';
      } catch (error) {
        console.error('Message encryption failed', error);
        throw new Error('Message was not sent because encryption failed.');
      }
    }

    let mediaId: string | undefined;
    if (blob) {
      mediaId = crypto.randomUUID();
      const sealedBytes = await sealBytes(new Uint8Array(await blob.arrayBuffer()));
      await db.media.put({
        id: mediaId,
        blob: new Blob([sealedBytes], { type: 'application/octet-stream' }),
        mime: mime || blob.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
        encrypted: true,
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
      expiresAt: undefined,
      reactions: {},
      status: 'sent',
      createdAt: new Date().toISOString(),
      deleted: false,
    };

    set((state) => ({ messages: [...state.messages, message] }));
    await persist(message);
    if (roomCode) {
      publish({ roomCode, senderId, type: 'chat', payload: message });
      const client = getRemoteClient();
      if (client) {
        try {
          const remoteSenderId = await ensureRemoteIdentity();
          const remoteRoomId = useAppStore.getState().roomId;
          if (!remoteSenderId || !remoteRoomId || remoteRoomId.startsWith('room-')) {
            throw new Error('This room has not been created on the configured Supabase project.');
          }
          if (blob && mediaId) {
            const encryptedMedia = await db.media.get(mediaId);
            if (!encryptedMedia) throw new Error('Encrypted media is missing from local storage.');
            await uploadRemoteMedia(
              remoteRoomId,
              mediaId,
              encryptedMedia.blob,
              mediaExpiry || 'keep',
              mime || blob.type || 'application/octet-stream',
            );
          }
          const { error } = await client.from('chat_messages').insert({
            id: message.id,
            room_id: remoteRoomId,
            room_code: roomCode,
            sender_device_id: remoteSenderId,
            sealed_content: sealedContent,
            media_id: mediaId,
            media_expiry: mediaExpiry,
            media_type: type === 'image' || type === 'video' || type === 'voice' ? type : null,
            media_mime: mime || blob?.type || null,
            expires_at: null,
          });
          if (error) throw error;
          void notifyRemotePartner(remoteRoomId, 'message').catch((notifyError: unknown) => {
            console.error('Private message push notification failed', notifyError);
          });
        } catch (error) {
          console.error('Remote chat insert failed', error);
          set((state) => ({
            messages: state.messages.map((item) =>
              item.id === message.id ? { ...item, status: 'sending' } : item,
            ),
          }));
          throw new Error('Message could not be delivered to the paired device.');
        }
      }
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
    if (!current || current.viewed) return;
    const isViewOnce = current.mediaExpiry === 'view-once';
    if (isViewOnce) {
      await get().deleteMessage(messageId);
      return;
    }
    const updated = {
      ...current,
      viewed: true,
      expiresAt: current.mediaExpiry ? mediaExpiresAt(current.mediaExpiry, Date.now(), true) : undefined,
    };
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
