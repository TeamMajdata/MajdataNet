# 上传页：手机端选背景图改走「文件」，且不再要求用户文件名

日期：2026-11-27
分支：`main`

## 背景

谱面上传有四个槽位：`maidata.txt`、`bg.png / bg.jpg`、`track.mp3`、`bg.mp4 / pv.mp4`。
原来有三个问题叠在一起：

1. **手机端点「选择」背景图会先进相册**。`accept="image/png,image/jpeg"` 是 MIME 类型，
   iOS 看到图片类型会先弹「照片图库 / 拍照 / 选择文件」菜单；`maidata.txt` 用的是
   `.txt` 扩展名，所以能直接打开「文件」App。同一张谱面文件夹里的东西，两边体验不一致。
2. **文件名被要求得死死的**。校验只认 `bg.png`、`bg.jpg`、`track.mp3`、`pv.mp4` 这些
   精确名字（区分大小写）。手机相册导出的 `IMG_0001.JPG`、网盘下载的 `封面.jpg` 全被判
   成非法，用户得先改名才能上传。
3. **接口靠标准文件名认文件**。`formfiles` 里的每个 part 用 `maidata.txt` / `bg.jpg` /
   `track.mp3` / `pv.mp4` 区分用途，不能直接把用户的原始文件名发过去。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/utils/chartUploadValidation.ts` | 改为「格式规则表」：每个槽位声明允许的扩展名、是否必填、扩展名 → 标准文件名的映射。新增 `isChartUploadFileFormatAccepted`（只按扩展名判断）、`getChartUploadAccept`（只用扩展名拼 `accept`）、`toStandardChartUploadFile`（改写成标准文件名并补正 MIME）、`buildChartUploadFormData`（按槽位顺序组装 FormData） |
| `src/components/user/ChartUploader.tsx` | 选择文件时只提示格式不对，不再提示文件名；提交时从 `picked` 状态组装 FormData，用户文件名不参与上报。背景图按扩展名映射 `bg.png` / `bg.jpg`（`.jpeg` 也算 jpg），视频统一 `pv.mp4`，音频统一 `track.mp3`，谱面统一 `maidata.txt` |
| `src/locales/{zh,en,ja,ko}.json` | `InvalidFileName` 改为 `InvalidFileFormat`，用 `{{formats}}` 显示该槽位接受的扩展名 |

`accept` 全部改成扩展名形式：`.txt` / `.png,.jpg,.jpeg` / `.mp3` / `.mp4`。WebKit 对只含
扩展名的 accept 会直接打开文件选择器，不再先给相册菜单；桌面端同样按扩展名过滤。

## 验证

- `test/utils/chartUploadValidation.test.ts` 重写（37 个用例）：任意文件名只要扩展名对就
  接受、大小写不敏感；`.gif` / `.webp` / `.wav` / `.mov` / 无扩展名 / `xxx.png.bak` 被拒；
  `accept` 不含任何 MIME（防止手机端退回相册）；标准名映射（含 `.jpeg` → `bg.jpg`）和
  FormData 的顺序、跳过空槽位、可选视频都覆盖。
- `pnpm test`（60 个文件、489 个用例）、`pnpm lint`、`tsc -p tsconfig.app.json --noEmit`
  / `tsc -p tsconfig.node.json --noEmit`、`pnpm i18n:check` 通过。
- 手机端行为依赖浏览器对 accept 的处理，无法在单元测试里模拟；用 iOS Safari 从「文件」
  App 选 `IMG_0001.JPG` 后，请求里的 part 名应为 `bg.jpg`，槽位显示仍是原文件名。

## 注意

- 只改文件名，不改文件内容；格式仍按扩展名判断，HEIC 之类后端不存的格式会被拒绝。
- 视频接口同时接受 `bg.mp4` 和 `pv.mp4`，这里统一用 `pv.mp4`（下载 zip 和编辑器查找
  视频时也是 `pv.mp4` 优先）。
- FormData 不再给未选中的槽位塞空 `File`，只按槽位顺序放已选文件；接口按文件名识别，
  不依赖 part 个数。
