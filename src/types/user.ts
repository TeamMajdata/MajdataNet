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

/** 用户组；administrator 通过所有用户组的检查。 */
export type UserGroup = 'administrator' | 'eventManager';

/** GET account/session 的响应，只列出网页用到的字段。 */
export interface SessionInfo {
  id: string;
  permissions: number;
  /** 当前会话实际能用的用户组；老会话或机台会话为空数组，旧版后端不返回。 */
  groups?: UserGroup[];
}
