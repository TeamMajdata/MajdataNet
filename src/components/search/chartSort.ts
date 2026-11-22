import { useTranslation } from 'react-i18next';

// 默认按最近活跃；hotp 为 Reddit 式热门（分数对数 + 上传时间），topp 为赞减踩
export const SORT_WORDS = ['', 'hotp', 'topp', 'commp', 'playp', 'timep'];

// URL 里的数字参数：缺省、非法或越界一律视为 0
export const parseIndexParam = (value: string | null, max: number) => {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : 0;
};

/** 排序菜单的选项文字，与 SORT_WORDS 一一对应 */
export function useSortOptions() {
  const { t } = useTranslation();
  return [
    t("home/HomePage.LatestActivityShort"),
    t("home/HomePage.HotShort"),
    t("home/HomePage.ScoreShort"),
    t("home/HomePage.CommentCount"),
    t("home/HomePage.PlayCount"),
    t("home/HomePage.UploadDate"),
  ];
}
