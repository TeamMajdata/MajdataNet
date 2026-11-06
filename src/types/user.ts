/** Public profiles omit email for other users. */
export interface UserInfo {
  id?: string;
  username: string;
  nickname?: string;
  email?: string | null;
  introduction?: string | null;
  avatarId?: string;
  joinDate?: string;
}

/**
 * 列表里随数据附带的精简资料：成绩总分榜和季赛榜的 `player`、评论的 `authorProfile`。
 * 没上传头像时 avatarId 为 "default"；nickname 可能为空串。
 */
export interface UserBrief {
  id: string;
  username: string;
  nickname: string;
  avatarId: string;
}

/** 用户组；administrator 通过所有用户组的检查。 */
export type UserGroup = 'administrator' | 'eventManager';

/** GET account/session 的响应，只列出网页用到的字段。 */
export interface SessionInfo {
  id: string;
  permissions: number;
  /** 当前会话实际能用的用户组；老会话或机台会话为空数组，旧版后端不返回。 */
  groups?: UserGroup[];
}
