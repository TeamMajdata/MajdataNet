import type { Song } from './song';
export interface Collection { id: string; name: string; createdBy: string; description: string | null; count: number; }
export interface CollectionSongList extends Collection { visibility: number; items: Song[]; }
export interface CollectionDanInfo extends Omit<Collection, 'count'> { songHashs: string[]; isPlayList: boolean; isForceGameover: boolean; }
