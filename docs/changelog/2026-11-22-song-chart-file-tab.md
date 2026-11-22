# 歌曲详情页新增“谱面文件”页签（Monaco 只读查看当前难度）

日期：2026-11-22
分支：`main`

## 背景

歌曲详情页原来只有谱面预览、排行榜、评论三个页签。谱师/玩家想核对谱面原文时只能先下载 zip 再打开 `maidata.txt`，
手机上尤其麻烦。这个页签提供在线的只读查看，并且只显示当前选中的难度，避免整份文件里七个 `&inote_N=` 段落混在一起。

高亮规则参考 MajdataEdit-Neo 的 `simai.tmLanguage.json`，token 的切分以本仓库 `src/majview/simai.js`
的解析逻辑为准（上游 `simai.js` 在 main 分支已不存在）。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/utils/simaiSection.ts` | 新增 `extractDifficulty`：从 `maidata.txt` 取出 `&inote_{level+1}=` 字段，处理 BOM / CRLF / 字段边界 |
| `src/utils/simaiMonarch.ts` | 新增 Monarch token 规则（顺序即优先级），scope 命名沿用上游 tmLanguage |
| `src/components/song/monacoSimai.ts` | 新增 Monaco 接入：editor worker、simai 语言注册、`majdata` 暗色主题 |
| `src/components/song/ChartFile.tsx` | 新增页签内容：SWR 取谱面文本（与侧栏 BPM/时长共用缓存）、复制按钮、只读 Monaco 编辑器 |
| `src/styles/components/simai-code.css` | 编辑器容器高度（桌面 72svh / 手机 62svh）、圆角与边框 |
| `src/pages/SongPage.tsx` | 新增 `chart` 页签（`?tab=chart`），Monaco 组件懒加载，只在页签激活时挂载 |
| `src/locales/{zh,en,ja,ko}.json` | 新增 `song/ChartFile` 文案 |
| `vite.config.ts` | 构建警告阈值调到 3000 kB（Monaco 按需 chunk 约 2.7 MB） |

## 验证

- 新增 `test/utils/simaiSection.test.ts`（字段提取、`inote_1` 与 `inote_10` 区分、BOM/空格）和
  `test/utils/simaiMonarch.test.ts`（slide/hold/touch/tap 优先级、`E` 与 `E7`、`12`、`1$$`、分支 slide）。
- `pnpm i18n:check`、`pnpm lint`、`tsc -b`、`pnpm test`、`pnpm build` 通过。
- 浏览器手测（dev）：`/song?id=…&tab=chart` 直接打开页签；切换难度后内容跟着变（`&inote_5` → `&inote_6`）；
  复制到剪贴板的是当前难度原文；手机 375px 宽度下正常；控制台无 Monaco / worker 报错。

## 注意

- monaco-editor 0.57 的 `exports` 把 `./*` 映射到 `./esm/vs/*.js`，导入路径必须写成
  `monaco-editor/editor/editor.api.js` / `monaco-editor/editor/editor.worker.js?worker`，
  网上常见的 `monaco-editor/esm/vs/...` 在 Vite 里会解析失败。
- `defineTheme` 必须传 `rules`（只传 `colors` 会在运行时抛 `reading 'fontStyle'`）。
- Monaco 只读查看器体积约 2.7 MB（gzip ≈ 710 kB）+ 270 kB worker，全部在 `chart` 页签的懒加载 chunk 里，
  不影响首页/歌曲页首屏；代价是首次打开该页签要下载这部分资源。
