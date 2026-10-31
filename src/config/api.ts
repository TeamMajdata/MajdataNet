export const apiroot3 = '/api3/api';

// 歌单 (Collection) 和收藏 (Favorite) 相关的 API 端点
export const endpoints = {
  playhistory: {
    ranking: `${apiroot3}/playhistory/ranking`,
  },
  recommend: {
    feed: (page: number, pageSize: number) => `${apiroot3}/recommend/feed?page=${page}&pageSize=${pageSize}`,
    impressions: `${apiroot3}/recommend/impressions`,
  },
  // 歌单 CRUD
  collection: {
    list: (page: number, pageSize: number, createdBy: string = '', keyword: string = '') => {
      if (createdBy === '') {
        return `${apiroot3}/collection/list?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}`;
      }
      return `${apiroot3}/collection/list?page=${page}&pageSize=${pageSize}&createdBy=${encodeURIComponent(createdBy)}&keyword=${encodeURIComponent(keyword)}`;
    },
    create: `${apiroot3}/collection/create`,
    hashlist: (id: string) => `${apiroot3}/collection/${id}/hashlist`,
    songlist: (id: string) => `${apiroot3}/collection/${id}/songlist`,
    destroy: (id: string) => `${apiroot3}/collection/${id}/destroy`,
    modify: (id: string) => `${apiroot3}/collection/${id}/modify`,
    diff: (id: string) => `${apiroot3}/collection/${id}/diff`,
  },
  // 收藏的歌单
  favorite: {
    list: `${apiroot3}/account/favorite/collection/list`,
    diff: `${apiroot3}/account/favorite/collection/diff`,
  },
  account: {
    profile: (username?: string) => `${apiroot3}/account/profile${username ? `?username=${encodeURIComponent(username)}` : ''}`,
    updateProfile: `${apiroot3}/account/profile`,
    login: `${apiroot3}/account/Login`,
    logout: `${apiroot3}/account/Logout`,
    register: `${apiroot3}/account/Register`,
    emailChallenge: `${apiroot3}/challenge/email`,
    passwordResetRequest: (email: string) => `${apiroot3}/account/password-reset/request?email=${encodeURIComponent(email)}`,
    passwordResetConfirm: `${apiroot3}/account/password-reset/confirm`,
    icon: (username: string) => `${apiroot3}/account/icon?username=${encodeURIComponent(username)}`,
    avatar: (avatarId: string) => `${apiroot3}/avatar/${encodeURIComponent(avatarId)}`,
    recent: (username: string) => `${apiroot3}/account/recent?username=${encodeURIComponent(username)}`,
    scores: `${apiroot3}/account/scores`,
    // 某个用户发表的评论（平铺、分页），sort 只接受 new / top
    comments: (username: string, sort: string, page: number) =>
      `${apiroot3}/account/comments?username=${encodeURIComponent(username)}&sort=${sort}&page=${page}`,
  },
  // 管理员接口；网页只用它探测当前用户是否为管理员（非管理员返回 403）
  admin: {
    groups: `${apiroot3}/admin/groups`,
  },
  // 评论：永久链接、编辑/删除、投票
  comment: {
    thread: (id: string, sort: string) => `${apiroot3}/comment/${encodeURIComponent(id)}?sort=${sort}`,
    item: (id: string) => `${apiroot3}/comment/${encodeURIComponent(id)}`,
    vote: (id: string) => `${apiroot3}/comment/${encodeURIComponent(id)}/vote`,
  },
  maichart: {
    list: `${apiroot3}/maichart/list`,
    listSearchAndSort: (searchKeyword: string = '', sortWord: string = '', page: number = 0) => `${apiroot3}/maichart/list?sort=${sortWord}&page=${page}&search=${encodeURIComponent(searchKeyword)}`,
    listSearch: (searchKeyword: string) => `${apiroot3}/maichart/list?sort=&search=${encodeURIComponent(searchKeyword)}`,
    listRanking: (sortType: string) => `${apiroot3}/maichart/list?&isRanking=true&sort=${encodeURIComponent(sortType)}`,
    upload: `${apiroot3}/maichart/upload`,
    hashStatus: (hash: string) => `${apiroot3}/maichart/hash-status?hash=${encodeURIComponent(hash)}`,
    delete: (chartId: string) => `${apiroot3}/maichart/delete?chartId=${chartId}`,
    summary: (id: string | number) => `${apiroot3}/maichart/${id}/summary`,
    radar: (id: string, chartLevel: number) => `${apiroot3}/maichart/${encodeURIComponent(id)}/radar?chartLevel=${chartLevel}`,
    image: (id: string | number) => `${apiroot3}/maichart/${id}/image`,
    fullImage: (id: string | number) => `${apiroot3}/maichart/${id}/image?fullImage=true`,
    interactsum: (id: string | number) => `${apiroot3}/maichart/${id}/interactsum`,
    // POST，请求体为谱面 ID 数组，一次取回一页列表的计数
    interactsumBatch: `${apiroot3}/maichart/interactsum`,
    vote: (id: string | number) => `${apiroot3}/maichart/${id}/vote`,
    comments: (id: string | number, sort: string, page: number) => `${apiroot3}/maichart/${id}/comments?sort=${sort}&page=${page}`,
    newComment: (id: string | number) => `${apiroot3}/maichart/${id}/comments`,
    score: (id: string | number) => `${apiroot3}/maichart/${id}/score`,
    tags: (id: string | number) => `${apiroot3}/maichart/${id}/tags`,
    publictags: (id: string | number) => `${apiroot3}/maichart/${id}/publictags`,
    prefix: (id: string | number) => `${apiroot3}/maichart/${id}`,
  },
  stats: {
    scoreSums: (uploader: string, page: number, pageSize: number) =>
      uploader
        ? `${apiroot3}/stats/score-sums?uploader=${encodeURIComponent(uploader)}&page=${page}&pageSize=${pageSize}`
        : `${apiroot3}/maiscore/sum/all?page=${page}&pageSize=${pageSize}`,
  },
  machine: {
    authInfo: (authId: string) => `${apiroot3}/machine/auth/info?auth-id=${encodeURIComponent(authId)}`,
    authPermit: (authId: string) => `${apiroot3}/machine/auth/permit?auth-id=${encodeURIComponent(authId)}`,
  }
};

