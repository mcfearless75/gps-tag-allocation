import type { Allocation, Tag, Player, TagSession } from './types';

export function computeUsualTagPerPlayer(historyAllocations: Allocation[]): Record<string, string> {
  const countsByPlayer: Record<string, Record<string, number>> = {};

  for (const allocation of historyAllocations) {
    const counts = (countsByPlayer[allocation.playerId] ??= {});
    counts[allocation.tagId] = (counts[allocation.tagId] ?? 0) + 1;
  }

  const usualTagByPlayer: Record<string, string> = {};
  for (const [playerId, counts] of Object.entries(countsByPlayer)) {
    let bestTagId = '';
    let bestCount = -1;
    for (const [tagId, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestTagId = tagId;
      }
    }
    usualTagByPlayer[playerId] = bestTagId;
  }

  return usualTagByPlayer;
}

export interface TagMismatch {
  playerId: string;
  sessionId: string;
  tagId: string;
  usualTagId: string;
}

export function findTagMismatches(
  weekAllocations: Allocation[],
  usualTagByPlayer: Record<string, string>
): TagMismatch[] {
  const mismatches: TagMismatch[] = [];

  for (const allocation of weekAllocations) {
    const usualTagId = usualTagByPlayer[allocation.playerId];
    if (usualTagId && usualTagId !== allocation.tagId) {
      mismatches.push({
        playerId: allocation.playerId,
        sessionId: allocation.sessionId,
        tagId: allocation.tagId,
        usualTagId,
      });
    }
  }

  return mismatches;
}

export function findPlayersWithNoAllocations(players: Player[], weekAllocations: Allocation[]): Player[] {
  const allocatedPlayerIds = new Set(weekAllocations.map((allocation) => allocation.playerId));
  return players.filter((player) => !allocatedPlayerIds.has(player.id));
}

export interface TagUtilization {
  tagId: string;
  sessionsUsed: number;
  lastUsedDate: string | null;
  idleDays: number | null;
}

export function computeTagUtilization(
  tags: Tag[],
  weekAllocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  referenceDate: string
): TagUtilization[] {
  const reference = new Date(referenceDate).getTime();

  return tags.map((tag) => {
    const tagAllocations = weekAllocations.filter((allocation) => allocation.tagId === tag.id);
    const sessionDates = tagAllocations
      .map((allocation) => sessionsById[allocation.sessionId]?.sessionDate)
      .filter((date): date is string => Boolean(date))
      .sort();

    const lastUsedDate = sessionDates.length > 0 ? sessionDates[sessionDates.length - 1] : null;
    const idleDays = lastUsedDate
      ? Math.floor((reference - new Date(lastUsedDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return { tagId: tag.id, sessionsUsed: tagAllocations.length, lastUsedDate, idleDays };
  });
}
