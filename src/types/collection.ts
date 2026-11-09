export interface Collection { id: string; name: string; createdBy: string; description: string | null; count: number; }
/** `items` are chart Ids (GUIDs) in collection order; fetch their metadata with `endpoints.maichart.info`. */
export interface CollectionSongList extends Collection { visibility: number; items: string[]; }
export interface CollectionDanInfo extends Omit<Collection, 'count'> { songHashs: string[]; isPlayList: boolean; isForceGameover: boolean; }
