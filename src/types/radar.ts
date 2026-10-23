export type RadarAxis = 'note' | 'peak' | 'sweep' | 'slide_tricky' | 'slide_sequence' | 'jack';

export interface ChartRadarResponse {
  featureOrder: string[];
  feature: Record<RadarAxis | 'fitted_constant', number | null>;
}
