export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Durée en secondes. */
  durationSeconds: number;
  /** Tempo en BPM. */
  tempo: number;
  artworkUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetlistSongItem {
  kind: "song";
  id: string;
  position: number;
  songId: string;
  title: string;
  artist: string;
  durationSeconds: number;
  tempo: number;
  artworkUrl?: string;
}

export interface SetlistPauseItem {
  kind: "pause";
  id: string;
  position: number;
  durationSeconds: number;
}

export type SetlistItem = SetlistSongItem | SetlistPauseItem;

/** Référence titre (dérivée des items song) — utile pour les listes. */
export interface SetlistSongRef {
  songId: string;
  position: number;
  title: string;
  artist: string;
  durationSeconds: number;
  tempo: number;
  artworkUrl?: string;
}

export interface SetlistGroup {
  index: number;
  label: string;
  songCount: number;
  /** Durée de jeu du set (titres uniquement). */
  durationSeconds: number;
}

export interface SetlistItemInputSong {
  kind: "song";
  songId: string;
}

export interface SetlistItemInputPause {
  kind: "pause";
  durationSeconds: number;
}

export type SetlistItemInput = SetlistItemInputSong | SetlistItemInputPause;

export interface Setlist {
  id: string;
  name: string;
  notes: string;
  concertDate?: string;
  createdAt: string;
  updatedAt: string;
  items: SetlistItem[];
  /** Titres uniquement (dérivé de `items`). */
  songs: SetlistSongRef[];
  /** Sets séparés par les pauses. */
  groups: SetlistGroup[];
  /** Somme des durées des titres (secondes). */
  estimatedDurationSeconds: number;
  /** Somme titres + pauses (secondes). */
  estimatedTotalSeconds: number;
  /** Somme des durées de pause (secondes). */
  pauseDurationSeconds: number;
}

export interface SetlistListResponse {
  songs: Song[];
  setlists: Setlist[];
}
