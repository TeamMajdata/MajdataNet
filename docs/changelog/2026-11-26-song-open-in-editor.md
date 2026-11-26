# 谱面页去掉「谱面文件」页签，改成「在 Edit 中打开」（只读）

日期：2026-11-26
分支：`main`

## 背景

谱面页原来的「谱面文件」页签是一个 Monaco 只读查看器：只能看、不能听、也不能换难度做对照。
站内已经有完整的编辑器（预览 + 波形 + 难度页签 + Monaco），把同一个谱面丢进编辑器只读打开，
既能看谱面原文，也能听到音乐 / PV、按难度切换、跟着波形对时间。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/pages/SongPage.tsx` | 删掉 `chart` 页签（桌面 / 手机两套 tab 表、页签面板、懒加载的 `ChartFile`）；操作区**最后**加一个「在 Edit 中打开」，链接到 `/editor?id=<谱面 id>&level=<当前难度>` |
| `src/pages/EditorPage.tsx` | 支持 `?id=`：进入**只读在线**模式。菜单栏只留「← 返回谱面页 / BPM Tap / 快捷键」，右上角显示「在线谱面 · 只读」；难度 / 制谱人 / First 输入框禁用；不写 IndexedDB 草稿、不响应 Ctrl+S / Ctrl+O；首屏按 `?level=` 选中难度 |
| `src/hooks/useChartFolder.ts` | 新增 `openOnline(id)`：只下载谱面文本（复用 `loadChartText` 的请求合并），音轨 / 视频 / 封面直接用 `/maichart/{id}` 下的接口地址，`save` 为 null |
| `src/components/editor/SimaiCodeEditor.tsx` | 新增 `readOnly`：Monaco `readOnly` 选项（`readOnly` 变化时 `updateOptions`），仍可滚动、跳转、查找替换 |
| `src/styles/components/editor.css` | `.editor-readonly-badge`（只读标记） |
| `src/styles/components/song-detail.css` | 手机端操作按钮允许换行（原来是横向滚动）：点赞点踩 + 下载 / 收藏 / 分享排一行，「在 Edit 中打开」落到第二行 |
| 删除 | `src/components/song/ChartFile.tsx`、`src/styles/components/simai-code.css`、4 个语言包里的 `song/ChartFile` 命名空间 |
| 文案 | 新增 `song/SongPage.OpenInEditor`、`editor/EditorPage.BackToSong` / `OnlineReadOnly` / `OpeningOnline`（4 语言） |

## 行为

- 谱面页 →「在 Edit 中打开」→ `/editor?id=…&level=…`：编辑器拉线上谱面文本，音轨和 PV 走接口，
  难度默认选中来源页面的那一档；切页签可看全部难度。
- 只读：Monaco 不能改；难度 / 制谱人 / First 输入框禁用；没有「文件」「编辑」菜单（所以没有新建、
  打开文件夹、保存、镜像旋转、谱面信息）；不产生本地草稿，也不拦截关闭页面。
- 「← 返回谱面页」回到 `/song?id=…`（难度保留在 URL 里，回去还是同一档）。
- 播放、波形、判断区、隐藏 note、倍速、搓碟等播放器功能照常可用。
- 手机（390px）上操作按钮换行显示，不再横向滚动：第一行「点赞点踩 / 下载 / 收藏 / 分享」，
  第二行「在 Edit 中打开」占满一行。

## 验证

- 浏览器手测（`/song?id=2075ebc0-…&level=4`）：
  - 页签只剩「谱面预览 / 排行榜」，操作区出现「在 Edit 中打开」，href 为
    `/editor?id=2075ebc0-…&level=4`；
  - 打开后：判定盘、PV（138.8s、可见）、Monaco 文本都正常，MASTER 页签选中，First 显示 4.11 且
    `disabled`，难度 13+ 且 `disabled`，右上角「在线谱面 · 只读」，Monaco 的 textarea 是
    `readonly="true"`；菜单栏只有「Majdata Edit / ← 返回谱面页 / BPM Tap / 快捷键」。
- `pnpm lint`、`tsc -b`、`pnpm i18n:check` 通过（68 个命名空间 / 677 个 key）。

## 注意

- 旧的 `/song?tab=chart` 深链接现在会落到默认页签（桌面「谱面预览」、手机「概览」）。
- `src/utils/simaiSection.ts` 保留：`maidataEdit.test.ts` 用它交叉校验字段切分，虽然页面已经不用了。
- 在线模式没有「另存为本地」：要改的话还是从「文件 → 打开文件夹」走本地流程。
