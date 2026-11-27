# View / Edit 设计文档

> 适用版本：MajdataNet v2，对应提交 `81d1343`（2026-11-27）
>
> 范围：`/song` 的谱面预览（View）与 `/editor` 的谱面编辑器（Edit）。
>
> 代码是唯一真源。本文描述**当前实现**；早期交互规格、决策过程和偏离记录见
> [editor-interaction-spec.md](../analysis/editor-interaction-spec.md)。改交互或控件绑定时，
> 请把对应文档一起改掉。

## 文档索引

| 文档 | 内容 | 适合谁 |
|---|---|---|
| [view.md](view.md) | 谱面预览的架构、数据流、播放状态机、控件与手势绑定、设置项、异常与降级 | 前端、播放器/引擎维护者 |
| [edit.md](edit.md) | 编辑器的数据模型、脏状态与自动保存、布局、菜单/快捷键/指针绑定、与预览的契约 | 前端、编辑器维护者 |
| [../analysis/editor-interaction-spec.md](../analysis/editor-interaction-spec.md) | 编辑器交互规格 v1：字段映射、六条决策、与 MajdataEdit-Neo 的差异、实现状态 | 想了解“为什么这样设计”的人 |
| [../analysis/majview-module-graph.html](../analysis/majview-module-graph.html) | `majview` ↔ `SongPage` 的模块连线图 | 架构、依赖分析 |
| [../changelog/](../changelog/) | 按日期记录的修复背景、验证方式和注意事项 | 排查回归、写发布说明 |

## 两个子系统的边界

```
/song?id=<chartId>                  /editor
        │                              │
        ▼                              ▼
   SongPage                       EditorPage
   ├─ 谱面信息 / 难度 / 页签       ├─ 本地文件夹 / 只读在线谱面
   ├─ 评论 / 排行榜 / 标签         ├─ Monaco 文本编辑
   └─ ChartPreview                ├─ 难度页签 / 元信息
        │                         ├─ 波形时间轴（portal）
        ▼                         └─ 浮动窗（设置 / BPM / 谱面信息）
      MajView ◀────────────────────────┘
        │
        ├─ src/majview：解析、渲染、音频、时间轴、设置
        └─ public/majview/skin：皮肤、音效、默认底图
```

| 维度 | View（`/song`） | Edit（`/editor`） |
|---|---|---|
| 数据来源 | 只读接口：`/chart`、`/track`、`/video`、封面接口 | 本地文件夹（`maidata.txt` + 媒体）；或 `?id=` 的只读在线谱面 |
| 是否可写 | 否 | 本地模式可写；`?id=` 模式只读 |
| 播放器用法 | 自带控制条、手势、键盘；页签切走时暂停但保留实例 | 隐藏自带控制条，只保留波形时间轴；由页面按钮/快捷键发命令 |
| 谱面更新 | 换难度/换歌时整份重载 | 每次输入热替换谱面；不重载音频、不跳播放位置 |
| 持久化 | `localStorage` 里的播放器设置 | 文件系统写回 `maidata.txt`；编辑草稿进 IndexedDB |
| 失败策略 | 保留封面/上一版画面，非阻塞提示 | 编译失败保留上一版谱面；打开失败必须显示原因，不能静默 |

## 共同约定

### 难度与 maidata 字段

- 难度索引 `level` 为 `0..6`：`EASY / BASIC / ADVANCED / EXPERT / MASTER / RE:MASTER / UTAGE`。
- maidata 里的序号 `N` 是 **1-based**，即 `N = level + 1`。
- 编辑器负责写入 `&inote_N`、`&lv_N`、`&des_N` 和全局 `&first`；`&first_N` 会被解析器优先读取
  （`first_{N} ?? first`），但编辑器不提供逐难度的 First 入口。
- 字段读写的实现见 `src/utils/maidataEdit.ts`；编辑器只替换值区间，保留 CRLF/BOM/空行/自定义字段。

### 时间语义

播放器里同时存在几个“时间”，不要混用：

| 名称 | 含义 | 来源 |
|---|---|---|
| 媒体时间 | `transport.time`，从 `begin` 开始计 | `Transport` 的高精度计时器（以 DSP 为锚点，`performance.now()` 外推） |
| DSP 时间 | 音频线程真正播到的位置，粒度约一个音频缓冲区 | `context.currentTime` + 输出延迟 |
| 谱面自带 `&first` | 谱面整体相对音乐平移的秒数 | maidata，编译进每个 note 的时间 |
| `First 偏移` | 播放器设置里的额外整体平移（毫秒） | `localStorage` 的 `FirstOffset` |
| `音效偏移` | 只影响打击音/音效、不动画面的校准值（毫秒） | `localStorage` 的 `Offset` |
| `begin` | 起播点；开头 clock 可能落在 0 之前 | `chartStart(chart)` |

界面上显示的时间统一是 `time - begin`，总长是 `duration - begin`。

### 目录与命名空间

- 播放器设置：`src/majview/settings.ts`，存储键 `MajViewSettingsV2`（旧版 `MajdataSettings` 会迁移）。
- 播放器皮肤/音效：`public/majview/skin/`。
- View 文案：`song/SongPage`、`song/MajView`。
- Edit 文案：`editor/EditorPage`、`editor/DifficultyTabs`、`editor/EditorWindow`、
  `editor/ChartInfoWindow`、`editor/BpmTapWindow`、`editor/useChartFolder`。
- 所有界面文字原则上走 i18n，不在组件里写死中文；BPM Tap 的 `Tap` / `Reset` 这类专有名词除外。新增 key 先加到 `en.json`，再跑 `pnpm i18n:fix`。

### 调试开关

| 开关 | 作用 |
|---|---|
| `?perf=1` | 强制打开播放器性能覆盖层，并暴露 `window.__majviewPerf` / `__majviewDebug` |
| `?debug=1` | 打开编辑器详细日志（写入 `localStorage`，`?debug=0` 关闭）；前缀 `[MajdataEdit][区域]`，区域：`picker` / `editor` / `majview` / `audio` |
| 开发模式 | `pnpm dev` 下编辑器日志默认打开 |

### 测试入口

- 播放器引擎：`test/majview/*.test.ts`（解析、golden parity、时钟、设置迁移、手势参数、时间轴绘制）。
- 编辑器工具：`test/utils/maidataEdit.test.ts`、`simaiTimeline.test.ts`、`simaiMirror.test.ts`、`autosave.test.ts`。
- 端到端：`e2e/editor-*.spec.ts`（打开失败、First/打击音等）；`pnpm test:e2e`。
- 全量：`pnpm lint`、`pnpm test`、`pnpm i18n:check`；改解析或皮肤资源后再跑 `pnpm build`。

## 阅读顺序

1. 先看 [view.md](view.md) 的“架构”和“播放状态机”，理解播放器与页面的分工。
2. 再看 [edit.md](edit.md) 的“数据模型”和“控件绑定总表”，理解 `maidata` 如何被编辑并热送给预览。
3. 需要追溯设计原因时，回到 [editor-interaction-spec.md](../analysis/editor-interaction-spec.md)。
