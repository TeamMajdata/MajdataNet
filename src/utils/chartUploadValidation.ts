/**
 * 上传槽位的格式规则。
 *
 * 只按扩展名判断格式，不要求用户把文件命名成标准名：手机相册、网盘导出的文件多半叫
 * `IMG_0001.JPG` 之类。真正发给接口时会按扩展名改写成 standardNames 里的标准文件名。
 */
export interface ChartUploadFileRule {
  /** 界面和「没有选中」提示里显示的名字；也是接口侧期望的标准文件名 */
  label: string;
  required: boolean;
  /** 允许的扩展名：小写、带点 */
  extensions: readonly string[];
  /** 扩展名 → 上报给接口的标准文件名 */
  standardNames: Readonly<Record<string, string>>;
}

export const CHART_UPLOAD_FILE_RULES: readonly ChartUploadFileRule[] = [
  {
    label: 'maidata.txt',
    required: true,
    extensions: ['.txt'],
    standardNames: { '.txt': 'maidata.txt' },
  },
  {
    label: 'bg.png / bg.jpg',
    required: true,
    extensions: ['.png', '.jpg', '.jpeg'],
    standardNames: { '.png': 'bg.png', '.jpg': 'bg.jpg', '.jpeg': 'bg.jpg' },
  },
  {
    label: 'track.mp3',
    required: true,
    extensions: ['.mp3'],
    standardNames: { '.mp3': 'track.mp3' },
  },
  {
    // 接口两个名字都认；下载 zip 和编辑器里都优先 pv.mp4，这里也统一成 pv.mp4
    label: 'bg.mp4 / pv.mp4',
    required: false,
    extensions: ['.mp4'],
    standardNames: { '.mp4': 'pv.mp4' },
  },
];

/** 改写成标准文件名时一并修正 MIME，避免手机端给空 type 或 application/octet-stream */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

/** 取小写扩展名（含点）；没有扩展名时返回空串 */
export function getChartUploadFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
}

/** 文件格式是否被该槽位接受；不检查大小和内容 */
export function isChartUploadFileFormatAccepted(index: number, fileName: string): boolean {
  const rule = CHART_UPLOAD_FILE_RULES[index];
  if (!rule) return false;
  return rule.extensions.includes(getChartUploadFileExtension(fileName));
}

/**
 * 该槽位的 `input[accept]`。
 *
 * 只用扩展名、不写 MIME：iOS 的 accept 里只要出现 `image/*`（`image/png` 也算），
 * 就会先弹「照片图库 / 拍照 / 选择文件」菜单；只写扩展名才会像 maidata.txt 一样
 * 直接打开「文件」App。
 */
export function getChartUploadAccept(index: number): string {
  return CHART_UPLOAD_FILE_RULES[index]?.extensions.join(',') ?? '';
}

/** 错误提示里展示的格式列表，如 `.png / .jpg / .jpeg` */
export function getChartUploadFormatHint(index: number): string {
  return CHART_UPLOAD_FILE_RULES[index]?.extensions.join(' / ') ?? '';
}

/**
 * 把用户选的文件改写成接口约定的标准文件名；格式不对返回 null。
 *
 * 名字本来就标准时原样返回，避免无谓地复制 File。
 */
export function toStandardChartUploadFile(index: number, file: File): File | null {
  const rule = CHART_UPLOAD_FILE_RULES[index];
  if (!rule) return null;

  const extension = getChartUploadFileExtension(file.name);
  if (!rule.extensions.includes(extension)) return null;

  const standardName = rule.standardNames[extension];
  if (file.name === standardName) return file;

  return new File([file], standardName, {
    type: MIME_BY_EXTENSION[extension] ?? file.type,
    lastModified: file.lastModified,
  });
}

/** 组装上传用的 FormData：按槽位顺序放入改写后的标准文件，未选的槽位直接跳过 */
export function buildChartUploadFormData(files: readonly (File | null | undefined)[]): FormData {
  const formData = new FormData();
  files.forEach((file, index) => {
    if (!file) return;
    const standardFile = toStandardChartUploadFile(index, file);
    if (standardFile) formData.append('formfiles', standardFile);
  });
  return formData;
}
