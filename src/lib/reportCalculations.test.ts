import { describe, it, expect } from 'vitest';
import {
  computeUsualTagPerPlayer,
  findTagMismatches,
  findPlayersWithNoAllocations,
  computeTagUtilization,
} from './reportCalculations';
import type { Allocation, Player, Tag, TagSession } from './types';

function makeAllocation(overrides: Partial<Allocation>): Allocation {
  return {
    id: 'a1',
    sessionId: 's1',
    tagId: 't1',
    playerId: 'p1',
    scannedOutBy: 'staff1',
    scannedOutAt: '2026-08-17T09:00:00Z',
    scannedInBy: null,
    scannedInAt: null,
    ...overrides,
  };
}

describe('computeUsualTagPerPlayer', () => {
  it('picks the most frequently allocated tag per player', () => {
    const history = [
      makeAllocation({ id: 'a1', playerId: 'p1', tagId: 't1' }),
      makeAllocation({ id: 'a2', playerId: 'p1', tagId: 't1' }),
      makeAllocation({ id: 'a3', playerId: 'p1', tagId: 't2' }),
      makeAllocation({ id: 'a4', playerId: 'p2', tagId: 't3' }),
    ];

    expect(computeUsualTagPerPlayer(history)).toEqual({ p1: 't1', p2: 't3' });
  });
});

describe('findTagMismatches', () => {
  it('flags allocations whose tag differs from the player usual tag', () => {
    const weekAllocations = [
      makeAllocation({ id: 'a1', sessionId: 's1', playerId: 'p1', tagId: 't2' }),
      makeAllocation({ id: 'a2', sessionId: 's2', playerId: 'p2', tagId: 't3' }),
    ];
    const usualTagByPlayer = { p1: 't1', p2: 't3' };

    expect(findTagMismatches(weekAllocations, usualTagByPlayer)).toEqual([
      { playerId: 'p1', sessionId: 's1', tagId: 't2', usualTagId: 't1' },
    ]);
  });

  it('ignores players with no known usual tag', () => {
    const weekAllocations = [makeAllocation({ playerId: 'p9', tagId: 't1' })];
    expect(findTagMismatches(weekAllocations, {})).toEqual([]);
  });
});

describe('findPlayersWithNoAllocations', () => {
  it('returns players who have zero allocations in the week', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alex', shirtNumber: 7 },
      { id: 'p2', name: 'Sam', shirtNumber: 9 },
    ];
    const weekAllocations = [makeAllocation({ playerId: 'p1' })];

    expect(findPlayersWithNoAllocations(players, weekAllocations)).toEqual([
      { id: 'p2', name: 'Sam', shirtNumber: 9 },
    ]);
  });
});

describe('computeTagUtilization', () => {
  it('counts sessions used, last-used date and idle days per tag', () => {
    const tags: Tag[] = [
      { id: 't1', tagCode: 'A', label: null, status: 'active' },
      { id: 't2', tagCode: 'B', label: null, status: 'active' },
    ];
    const sessionsById: Record<string, TagSession> = {
      s1: { id: 's1', sessionDate: '2026-08-17', sessionType: 'training', notes: null, createdBy: 'staff1' },
      s2: { id: 's2', sessionDate: '2026-08-19', sessionType: 'training', notes: null, createdBy: 'staff1' },
    };
    const weekAllocations = [
      makeAllocation({ id: 'a1', tagId: 't1', sessionId: 's1' }),
      makeAllocation({ id: 'a2', tagId: 't1', sessionId: 's2' }),
    ];

    const result = computeTagUtilization(tags, weekAllocations, sessionsById, '2026-08-21');

    expect(result).toEqual([
      { tagId: 't1', sessionsUsed: 2, lastUsedDate: '2026-08-19', idleDays: 2 },
      { tagId: 't2', sessionsUsed: 0, lastUsedDate: null, idleDays: null },
    ]);
  });
});
