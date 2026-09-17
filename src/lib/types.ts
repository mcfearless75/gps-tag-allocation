export interface Player {
  id: string;
  name: string;
  shirtNumber: number | null;
  catapultCode: string | null;
}

export interface Tag {
  id: string;
  tagCode: string;
  label: string | null;
  status: 'active' | 'retired' | 'lost';
}

export type SessionType = 'training' | 'match' | 'gym' | 'other';

export interface TagSession {
  id: string;
  sessionDate: string;
  sessionType: SessionType;
  notes: string | null;
  createdBy: string;
}

export interface Allocation {
  id: string;
  sessionId: string;
  tagId: string;
  playerId: string;
  scannedOutBy: string;
  scannedOutAt: string;
  scannedInBy: string | null;
  scannedInAt: string | null;
}
