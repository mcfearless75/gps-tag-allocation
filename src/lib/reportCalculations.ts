import type { Allocation, Tag, Player, TagSession, SessionType } from './types';

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

export interface PlayerBreakdownEntry {
  date: string;
  sessionType: SessionType;
  tagCode: string;
  scannedOutAt: string;
  scannedInAt: string | null;
}

export interface PlayerBreakdown {
  playerId: string;
  name: string;
  shirtNumber: number | null;
  sessionCount: number;
  hasAnomaly: boolean;
  entries: PlayerBreakdownEntry[];
}

export function buildPlayerBreakdown(
  players: Player[],
  weekAllocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  tagsById: Record<string, Tag>,
  mismatches: TagMismatch[]
): PlayerBreakdown[] {
  const mismatchedKeys = new Set(mismatches.map((m) => `${m.playerId}:${m.sessionId}:${m.tagId}`));

  return players.map((player) => {
    const playerAllocations = weekAllocations.filter((a) => a.playerId === player.id);
    const entries: PlayerBreakdownEntry[] = playerAllocations
      .map((allocation) => {
        const session = sessionsById[allocation.sessionId];
        return {
          date: session?.sessionDate ?? '',
          sessionType: session?.sessionType ?? ('other' as SessionType),
          tagCode: tagsById[allocation.tagId]?.tagCode ?? '',
          scannedOutAt: allocation.scannedOutAt,
          scannedInAt: allocation.scannedInAt,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const hasAnomaly = playerAllocations.some((a) =>
      mismatchedKeys.has(`${a.playerId}:${a.sessionId}:${a.tagId}`)
    );

    return {
      playerId: player.id,
      name: player.name,
      shirtNumber: player.shirtNumber,
      sessionCount: playerAllocations.length,
      hasAnomaly,
      entries,
    };
  });
}

export interface SessionLogRow {
  tagCode: string;
  playerName: string;
  shirtNumber: number | null;
  scannedOutAt: string;
  scannedInAt: string | null;
}

export interface SessionGroup {
  sessionId: string;
  date: string;
  sessionType: SessionType;
  rows: SessionLogRow[];
}

export function groupAllocationsBySession(
  allocations: Allocation[],
  sessionsById: Record<string, TagSession>,
  playersById: Record<string, Player>,
  tagsById: Record<string, Tag>
): SessionGroup[] {
  const groupsBySessionId: Record<string, SessionGroup> = {};

  for (const allocation of allocations) {
    const session = sessionsById[allocation.sessionId];
    if (!session) continue;

    const group = (groupsBySessionId[session.id] ??= {
      sessionId: session.id,
      date: session.sessionDate,
      sessionType: session.sessionType,
      rows: [],
    });

    group.rows.push({
      tagCode: tagsById[allocation.tagId]?.tagCode ?? '',
      playerName: playersById[allocation.playerId]?.name ?? '',
      shirtNumber: playersById[allocation.playerId]?.shirtNumber ?? null,
      scannedOutAt: allocation.scannedOutAt,
      scannedInAt: allocation.scannedInAt,
    });
  }

  return Object.values(groupsBySessionId).sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeekSummary {
  allocationsCount: number;
  anomaliesCount: number;
  tagsUsedCount: number;
}

export interface WeekOverWeekDelta extends WeekSummary {
  deltaAllocations: number;
  deltaAnomalies: number;
  deltaTagsUsed: number;
}

export function weekOverWeekDelta(current: WeekSummary, previous: WeekSummary): WeekOverWeekDelta {
  return {
    allocationsCount: current.allocationsCount,
    anomaliesCount: current.anomaliesCount,
    tagsUsedCount: current.tagsUsedCount,
    deltaAllocations: current.allocationsCount - previous.allocationsCount,
    deltaAnomalies: current.anomaliesCount - previous.anomaliesCount,
    deltaTagsUsed: current.tagsUsedCount - previous.tagsUsedCount,
  };
}
