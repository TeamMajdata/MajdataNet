export const apiroot3 = '/api3/api';

// 歌单 (Collection) 和收藏 (Favorite) 相关的 API 端点
export const endpoints = {
  // 歌单 CRUD
  collection: {
    list: (page: number, pageSize: number, createdBy: string = '') => {
      if (createdBy === '') {
        return `${apiroot3}/collection/list?page=${page}&pageSize=${pageSize}`;
      }
      return `${apiroot3}/collection/list?page=${page}&pageSize=${pageSize}&createdBy=${encodeURIComponent(createdBy)}`;
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
    info: `${apiroot3}/account/info/`,
    login: `${apiroot3}/account/Login`,
    logout: `${apiroot3}/account/Logout`,
    register: `${apiroot3}/account/Register`,
    verify: (otp: string) => `${apiroot3}/account/verify?otp=${otp}`,
    forget: `${apiroot3}/account/forget`,
    icon: (username: string) => `${apiroot3}/account/Icon?username=${username}`,
    uploadIcon: `${apiroot3}/account/Icon`,
    intro: (username: string) => `${apiroot3}/account/intro?username=${username}`,
    uploadIntro: `${apiroot3}/account/intro`,
    recent: (username: string) => `${apiroot3}/account/Recent?username=${username}`,
    scores: `${apiroot3}/account/scores`,
  },
  maichart: {
    list: `${apiroot3}/maichart/list`,
    listSearchAndSort: (searchKeyword: string = '', sortWord: string = '', page: number = 0) => `${apiroot3}/maichart/list?sort=${sortWord}&page=${page}&search=${encodeURIComponent(searchKeyword)}`,
    listSearch: (searchKeyword: string) => `${apiroot3}/maichart/list?sort=&search=${encodeURIComponent(searchKeyword)}`,
    listRanking: (sortType: string) => `${apiroot3}/maichart/list?&isRanking=true&sort=${encodeURIComponent(sortType)}`,
    upload: `${apiroot3}/maichart/upload`,
    delete: (chartId: string) => `${apiroot3}/maichart/delete?chartId=${chartId}`,
    summary: (id: string | number) => `${apiroot3}/maichart/${id}/summary`,
    image: (id: string | number) => `${apiroot3}/maichart/${id}/image`,
    fullImage: (id: string | number) => `${apiroot3}/maichart/${id}/image?fullImage=true`,
    interact: (id: string | number) => `${apiroot3}/maichart/${id}/interact`,
    interactsum: (id: string | number) => `${apiroot3}/maichart/${id}/interactsum`,
    score: (id: string | number) => `${apiroot3}/maichart/${id}/score`,
    tags: (id: string | number) => `${apiroot3}/maichart/${id}/tags`,
    publictags: (id: string | number) => `${apiroot3}/maichart/${id}/publictags`,
    prefix: (id: string | number) => `${apiroot3}/maichart/${id}`,
  },
  stats: {
    scoreSums: (uploader: string, page: number, pageSize: number) =>
      `${apiroot3}/stats/score-sums?uploader=${encodeURIComponent(uploader)}&page=${page}&pageSize=${pageSize}`,
  },
  machine: {
    authInfo: (authId: string) => `${apiroot3}/machine/auth/info?auth-id=${authId}`,
    authPermit: (authId: string) => `${apiroot3}/machine/auth/permit?auth-id=${authId}`,
  }
};


