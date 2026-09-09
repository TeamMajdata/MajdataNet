export const CHART_UPLOAD_FILE_NAMES = [
  ['maidata.txt'],
  ['bg.png', 'bg.jpg'],
  ['track.mp3'],
  ['bg.mp4', 'pv.mp4'],
] as const;

export function isValidChartUploadFileName(index: number, fileName: string): boolean {
  const allowedNames = CHART_UPLOAD_FILE_NAMES[index] as readonly string[] | undefined;
  return allowedNames?.includes(fileName) ?? false;
}

export function getExpectedChartUploadFileNames(index: number): string {
  return CHART_UPLOAD_FILE_NAMES[index]?.join('/') ?? '';
}
