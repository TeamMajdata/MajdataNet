export const apiroot3 = '/api3/api';

// 歌单 (Collection) 和收藏 (Favorite) 相关的 API 端点
export const endpoints = {
  // 成绩排行与统计，统一位于 /api/maiscore 下
  maiscore: {
    // 单谱面排行榜，响应 { hash, levelHashes, scores }：levelHashes 固定 7 项，下标为难度序号，
    // 没有 inote 的难度为 null；scores[level] 为该难度按 level hash 查到的前 10 名，共 8 项，最后一项恒为空数组
    chartLeaderboard: (chartId: string | number) =>
      `${apiroot3}/maiscore/leaderboard/chart/by-id/${encodeURIComponent(chartId)}`,
    // 单个难度（level hash）的排行榜，响应 { levelHash, scores }；成绩按 level hash 共享，
    // 内容相同的难度（换源前后、不同谱面）是同一个榜。levelHash 不是 64 位小写 hex 时返回 400
    levelLeaderboard: (levelHash: string) =>
      `${apiroot3}/maiscore/leaderboard/chart/by-level/${encodeURIComponent(levelHash)}`,
    // POST，按谱面 Id 集合（请求体 songIds）和时间段统计排行（季赛榜）
    periodLeaderboard: `${apiroot3}/maiscore/leaderboard/period`,
    // 成绩总和榜；uploader 为空时为全站榜，否则只统计该上传者的谱面
    // 个人 rating 雷达：前 50 个「谱面 + 难度」的加权平均，best 与 account/scores 的元素结构相同
    rating: (username: string) =>
      `${apiroot3}/maiscore/rating/by-username/${encodeURIComponent(username)}`,
    scoreSums: (uploader: string, page: number, pageSize: number) =>
      uploader
        ? `${apiroot3}/maiscore/sum/chart/by-uploader/${encodeURIComponent(uploader)}?page=${page}&pageSize=${pageSize}`
        : `${apiroot3}/maiscore/sum/all?page=${page}&pageSize=${pageSize}`,
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
    // 响应的 items 为谱面 Id 数组（歌单顺序），谱面信息用 maichart.info 批量获取
    songlist: (id: string) => `${apiroot3}/collection/${id}/songlist`,
    destroy: (id: string) => `${apiroot3}/collection/${id}/destroy`,
    // PUT，请求体 { name?, description?, visibility?, items? }；items 为谱面 Id 数组，整体替换歌单内容（按请求顺序），
    // 空数组清空歌单，不传则保留原内容
    modify: (id: string) => `${apiroot3}/collection/${id}/modify`,
  },
  // 收藏的歌单
  favorite: {
    list: `${apiroot3}/account/favorite/collection/list`,
    diff: `${apiroot3}/account/favorite/collection/diff`,
  },
  account: {
    profile: (username?: string) => `${apiroot3}/account/profile${username ? `?username=${encodeURIComponent(username)}` : ''}`,
    updateProfile: `${apiroot3}/account/profile`,
    // 当前会话，groups 是这个会话实际能用的用户组
    session: `${apiroot3}/account/session`,
    login: `${apiroot3}/account/Login`,
    logout: `${apiroot3}/account/Logout`,
    register: `${apiroot3}/account/Register`,
    emailChallenge: `${apiroot3}/challenge/email`,
    passwordResetRequest: (email: string) => `${apiroot3}/account/password-reset/request?email=${encodeURIComponent(email)}`,
    passwordResetConfirm: `${apiroot3}/account/password-reset/confirm`,
    // 头像统一用 avatarId；只有用户名时由 useAvatarUrl 先查资料取 avatarId
    avatar: (avatarId: string) => `${apiroot3}/avatar/${encodeURIComponent(avatarId)}`,
    recent: (username: string) => `${apiroot3}/account/recent?username=${encodeURIComponent(username)}`,
    scores: `${apiroot3}/account/scores`,
    // 某个用户发表的评论（平铺、分页），sort 只接受 new / top
    comments: (username: string, sort: string, page: number) =>
      `${apiroot3}/account/comments?username=${encodeURIComponent(username)}&sort=${sort}&page=${page}`,
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
    // POST，请求体为谱面 Id 数组；按请求顺序返回 { metadata, resources, levelHashes } 数组，不存在的谱面被略过
    info: `${apiroot3}/maichart/info`,
    radar: (id: string, chartLevel: number) => `${apiroot3}/maichart/${encodeURIComponent(id)}/radar?chartLevel=${chartLevel}`,
    image: (id: string | number) => `${apiroot3}/maichart/${id}/image`,
    fullImage: (id: string | number) => `${apiroot3}/maichart/${id}/image?fullImage=true`,
    interactsum: (id: string | number) => `${apiroot3}/maichart/${id}/interactsum`,
    // POST，请求体为谱面 ID 数组，一次取回一页列表的计数
    interactsumBatch: `${apiroot3}/maichart/interactsum`,
    vote: (id: string | number) => `${apiroot3}/maichart/${id}/vote`,
    comments: (id: string | number, sort: string, page: number) => `${apiroot3}/maichart/${id}/comments?sort=${sort}&page=${page}`,
    newComment: (id: string | number) => `${apiroot3}/maichart/${id}/comments`,
    tags: (id: string | number) => `${apiroot3}/maichart/${id}/tags`,
    publictags: (id: string | number) => `${apiroot3}/maichart/${id}/publictags`,
    prefix: (id: string | number) => `${apiroot3}/maichart/${id}`,
  },
  machine: {
    authInfo: (authId: string) => `${apiroot3}/machine/auth/info?auth-id=${encodeURIComponent(authId)}`,
    authPermit: (authId: string) => `${apiroot3}/machine/auth/permit?auth-id=${encodeURIComponent(authId)}`,
  }
};

