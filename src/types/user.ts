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
