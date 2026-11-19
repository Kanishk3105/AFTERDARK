export interface ChannelEnvelope {
  roomCode: string;
  senderId: string;
  type: 'chat' | 'delete' | 'engine' | 'presence';
  payload: unknown;
}

type Listener = (envelope: ChannelEnvelope) => void;

const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel('afterdark-room');
    channel.onmessage = (event: MessageEvent<ChannelEnvelope>) => {
      listeners.forEach((listener) => listener(event.data));
    };
  }
  return channel;
}

export function publish(envelope: ChannelEnvelope): void {
  getChannel()?.postMessage(envelope);
}

export function subscribe(listener: Listener): () => void {
  getChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sameBrowserSyncAvailable(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}
