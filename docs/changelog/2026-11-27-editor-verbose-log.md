# 编辑器加了可开关的详细日志（排查选择器 / 没声音）

日期：2026-11-27
分支：`main`

## 背景

「点了打开文件夹没反应」「新建之后没声音」这类问题依赖浏览器的瞬时状态（用户手势、焦点、
可见性、媒体错误码），用户描述不出来，开发者也不方便现场看。加一个可开关的日志通道，
把关键链路和当时的浏览器状态一起打到 console。

## 用法

| 场景 | 做法 |
| --- | --- |
| 开发模式（`pnpm dev`） | 默认就在记，不需要任何参数 |
| 线上排查 | 地址后加 `?debug=1`（会写进 localStorage，刷新后仍然开着）；`?debug=0` 关掉 |
| 运行时切换 | `import { setVerboseLogging } from '@/utils/editorLog'; setVerboseLogging(true)` |

输出统一带 `[MajdataEdit][区域]` 前缀，可以在 DevTools 的 console 过滤框里输入
`MajdataEdit` 只看编辑器日志，或者 `[picker]` / `[audio]` 只看某一类。

## 记录哪些东西

| 区域 | 内容 |
| --- | --- |
| `picker` | `showDirectoryPicker` 调用前的**手势快照**（`navigator.userActivation.isActive` / `hasEverBeenActive`、`document.hasFocus()`、`visibilityState`）、返回耗时、用户取消、抛错的 name/message、8 秒无结果、用户放弃等待、读到的文件名列表 |
| `editor` | 打开 / 新建 / 在线谱面的开始与结果、装入文件夹（含 maidata 长度、有没有 track/cover/pv、能否原地保存）、谱面已载入（难度分布、选中的难度）、草稿是否询问/忽略、保存开始与完成（耗时、字符数） |
| `majview` | 谱面加载失败、热替换编译失败（保留上一版）、PV 就绪 / 播放出错（`MediaError.code` + message + 当前时间 + 重试次数） |
| `audio` | 音轨就绪（样本数量、**缺失的样本名**、事件数、总长、起点）、音效表更新（音符数、事件数、begin/duration、是否在播放） |

失败一律用 `console.error` 并把原始错误对象一起传进去（保留 stack），不只留一行 message。

## 改动

| 位置 | 改动 |
| --- | --- |
| `src/utils/editorLog.ts` | 新增：`verboseLogging()` / `setVerboseLogging()` / `editorLog` / `editorWarn` / `editorError` / `activationSnapshot()`；默认开发模式开启，`?debug=1` 打开并持久化 |
| `src/hooks/useChartFolder.ts` | 选择器调用前后、读目录、装入文件夹、打开/新建/在线谱面、慢选择器、取消都记日志 |
| `src/pages/EditorPage.tsx` | 谱面载入、难度选择、草稿决定、保存都记日志 |
| `src/components/song/MajView.tsx` | 谱面加载/编译失败、PV 事件、音轨就绪（含缺失样本）、音效表更新都记日志 |

## 验证

dev（`/editor?debug=1`）里桩掉 `showDirectoryPicker` 抛错，console 依次出现：

```
[MajdataEdit][editor] 打开文件夹：开始 {preselected:false, supportsPicker:true}
[MajdataEdit][picker] showDirectoryPicker 调用 {options:{mode:'readwrite'}, activation:{active:true, ever:true}, focus:true, visibility:'visible'}
[MajdataEdit][picker] showDirectoryPicker 抛错 NotAllowedError: The request is not allowed ... {ms, activation…}
```

空谱面上播放后可以看到 `[MajdataEdit][audio] 音轨就绪 {samples:10, missingSamples:[], events:0…}`，
用缺失样本名就能直接判断「没声音」是不是样本没加载。

## 注意

- 日志只在显式开启时输出，线上默认不打扰；`?debug=1` 会留在 localStorage，排查完记得 `?debug=0`。
- 故意不记录逐帧 / 逐字符的高频数据（编辑器每敲一个字都会重编译），以免把关键信息淹掉。
- 之后要加日志，直接用 `editorLog('区域', '事件', {…})`，不要再散写 `console.log`。
