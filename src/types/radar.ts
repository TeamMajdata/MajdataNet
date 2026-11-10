export type RadarAxis = 'note' | 'peak' | 'sweep' | 'slide_tricky' | 'slide_sequence' | 'jack';

export interface ChartRadarResponse {
  featureOrder: string[];
  feature: Record<RadarAxis | 'fitted_constant', number | null>;
}

import type { Score } from './score';

/** GET /api/maiscore/rating/by-username/{username} 的响应。 */
export interface RatingRadarResponse {
  /** 七个特征名，顺序与 feature 的插入顺序一致。 */
  featureOrder: string[];
  /** 各特征按 DX 达成率/101 加权后的平均值；没有可计算数据时为空对象。 */
  feature: Record<RadarAxis | 'fitted_constant', number | null>;
  /** 实际参与平均的谱面 Id，按参与顺序；同一谱面的不同难度会出现多次。 */
  charts: string[];
  /** 同一批「谱面 + 难度」的成绩，结构与 GET api/account/scores 的元素相同。 */
  best: Score[];
  /** 参与的前 50 个「谱面 + 难度」数。 */
  scoreCount: number;
  /** 实际参与平均的谱面数，雷达分析失败时小于 scoreCount。 */
  chartCount: number;
}