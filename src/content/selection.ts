import { db, type EncounterStatus, type HistoryRecord } from '@/data/db';
import { useGameStore } from '@/stores/game.store';
import type { ContentCard } from '@/types';
import { selectMany, selectNext, type SelectRequest } from './engine';

type SelectionResult =
  | { ok: true; card: ContentCard; recorded: boolean }
  | { ok: false; reason: string };

type BatchSelectionResult =
  | { ok: true; cards: ContentCard[]; recorded: boolean[] }
  | { ok: false; reason: string };

function ledgerRequest(
  request: SelectRequest,
  history: HistoryRecord[],
  localHistory: ReturnType<typeof useGameStore.getState>,
): SelectRequest {
  return {
    ...request,
    history: Array.from(new Set([
      ...request.history,
      ...localHistory.cardHistory,
      ...history.map((item) => item.id),
    ])),
    fingerprints: Array.from(new Set([
      ...request.fingerprints,
      ...localHistory.fingerprints,
      ...history.map((item) => item.fingerprint).filter(Boolean),
    ])),
    similarityGroups: Array.from(new Set([
      ...(request.similarityGroups ?? []),
      ...localHistory.similarityGroups,
      ...history.map((item) => item.similarityGroup).filter((group): group is string => Boolean(group)),
    ])),
  };
}

function historyRecord(
  card: ContentCard,
  sessionId: string,
  status: EncounterStatus,
  selectionId?: string,
  batchId?: string,
  selectionIndex?: number,
): HistoryRecord {
  return {
    id: card.id,
    fingerprint: card.contentFingerprint,
    gameId: card.gameId,
    moodId: card.mood,
    intensity: card.intensity,
    contentRating: card.contentRating,
    sessionId,
    status,
    normalizedText: card.normalizedText,
    similarityGroup: card.similarityGroup,
    contentVersion: card.contentVersion,
    selectionId,
    batchId,
    selectionIndex,
    cardSnapshot: card,
    seenAt: new Date().toISOString(),
  };
}

export async function selectAndRecordNext(
  request: SelectRequest,
  sessionId: string,
  selectionId: string = crypto.randomUUID(),
): Promise<SelectionResult> {
  const selected = await db.transaction('rw', db.history, async () => {
    const previous = await db.history.where('selectionId').equals(selectionId).first();
    if (previous) {
      if (!previous.cardSnapshot) {
        throw new Error(`Content selection ${selectionId} is missing its recovery snapshot.`);
      }
      return { result: { ok: true as const, card: previous.cardSnapshot }, created: false };
    }

    const storedHistory = await db.history.toArray();
    const result = selectNext(ledgerRequest(request, storedHistory, useGameStore.getState()));
    if (!result.ok) return { result, created: false };
    await db.history.add(historyRecord(result.card, sessionId, 'shown', selectionId));
    return { result, created: true };
  });

  if (!selected.result.ok) return selected.result;
  const recorded = useGameStore.getState().recordCardEncountered(
    selected.result.card,
    sessionId,
    'shown',
    false,
  );
  return { ok: true, card: selected.result.card, recorded: selected.created && recorded };
}

export async function selectAndRecordMany(
  request: SelectRequest,
  count: number,
  sessionId: string,
  batchId: string = crypto.randomUUID(),
): Promise<BatchSelectionResult> {
  const selected = await db.transaction('rw', db.history, async () => {
    const previous = await db.history.where('batchId').equals(batchId).toArray();
    if (previous.length > 0) {
      const recovered = previous
        .sort((left, right) => (left.selectionIndex ?? -1) - (right.selectionIndex ?? -1));
      if (recovered.length !== count || recovered.some((item) => !item.cardSnapshot)) {
        throw new Error(`Content selection batch ${batchId} cannot be recovered completely.`);
      }
      return {
        ok: true as const,
        cards: recovered.map((item) => item.cardSnapshot!),
        created: false,
      };
    }

    const storedHistory = await db.history.toArray();
    const result = selectMany(ledgerRequest(request, storedHistory, useGameStore.getState()), count);
    if (!Array.isArray(result)) return result;

    const cards = result.map(({ card }) => card);
    await db.history.bulkAdd(cards.map((card, index) =>
      historyRecord(card, sessionId, 'reserved', `${batchId}:${index}`, batchId, index)));
    return { ok: true as const, cards, created: true };
  });

  if (!selected.ok) return selected;
  const recorded = selected.cards.map((card) =>
    selected.created && useGameStore.getState().recordCardEncountered(card, sessionId, 'reserved', false));
  return { ok: true, cards: selected.cards, recorded };
}
