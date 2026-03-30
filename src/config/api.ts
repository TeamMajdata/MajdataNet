export const apiroot3 = '/api3/api';

// 歌单 (Collection) 和收藏 (Favorite) 相关的 API 端点
export const endpoints = {
  // 歌单 CRUD
  collection: {
    list: `${apiroot3}/collection/list`,
    create: `${apiroot3}/collection/create`,
    hashlist: (id: string) => `${apiroot3}/collection/${id}/hashlist`,
    songlist: (id: string) => `${apiroot3}/collection/${id}/songlist`,
    destroy: (id: string) => `${apiroot3}/collection/${id}/destroy`,
    modify: (id: string) => `${apiroot3}/collection/${id}/modify`,
  },
  // 收藏的歌单
  favorite: {
    list: `${apiroot3}/account/favorite/collection/list`,
    diff: `${apiroot3}/account/favorite/collection/diff`,
  },
};

