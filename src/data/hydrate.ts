import { db } from '@/data/db';
import { useChatStore } from '@/stores/chat.store';
import { useGameStore } from '@/stores/game.store';

export async function hydrate(): Promise<void> {
  try {
    const [messages, history] = await Promise.all([
      db.messages.orderBy('createdAt').toArray(),
      db.history.toArray(),
    ]);
    if (messages.length > 0) {
      useChatStore.getState().setMessages(messages);
    } else {
      useChatStore.setState({ hydrated: true });
    }
    if (history.length > 0) {
      const local = useGameStore.getState();
      const ids = Array.from(new Set([...local.cardHistory, ...history.map((item) => item.id)]));
      const prints = Array.from(
        new Set([...local.fingerprints, ...history.map((item) => item.fingerprint).filter(Boolean)]),
      );
      local.replaceHistory(ids, prints);
    }
  } catch (error) {
    console.error('Local database unavailable', error);
    useChatStore.setState({ hydrated: true });
  }
}
