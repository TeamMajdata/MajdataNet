# 谱面编辑器（Edit）设计文档

> 入口：`/editor`（本地文件夹）、`/editor?id=<chartId>&level=<难度>`（只读在线谱面）
>
> 核心组件：`EditorPage` + `SimaiCodeEditor`（Monaco）+ `MajView`（实时预览）+ `DifficultyTabs`
>
> 早期交互规格与决策过程见 [editor-interaction-spec.md](../analysis/editor-interaction-spec.md)；
> 播放器本身的架构见 [view.md](view.md)。

## 1. 目标与非目标

### 目标

- 在浏览器里编辑 simai 谱面，**边改边看、边听**：预览直接吃编辑器里的 `maidata` 文本，不等保存。
- 以整份 `maidata.txt` 为唯一真源，只改当前难度的 `&inote_N`，其余字节原样保留。
- 七个难度各有独立页签、独立草稿和独立撤销栈；按难度记脏。
- 本地文件夹优先用 File System Access API 原地保存；不支持时退化为只读打开 + 下载 `maidata.txt`。
- 自动保存只作为“防丢草稿”，不改变“已保存/未保存”的语义。
- 输入、播放、时间轴三者能互相对位：光标 ↔ 谱面格子 ↔ 播放时间。

### 非目标

- 不做账号、上传、发布、审核；
- 不做“另存为 / 导出视频 / 上传到站内”（当前版本不提供）；
- 不编辑封面/背景视频文件（谱面信息窗只改 `maidata` 里的字段）；
- 不追求与 MajdataEdit-Neo 的所有菜单项一一对应（差异见 §11）。

## 2. 入口与模式

| 模式 | URL | 数据来源 | 可编辑 | 保存 |
|---|---|---|---|---|
| 本地文件夹 | `/editor` | `showDirectoryPicker({ mode: 'readwrite' })` 或 `<input webkitdirectory>` | 是（有写句柄时） | 写回 `maidata.txt` 或下载 |
| 在线只读 | `/editor?id=<chartId>&level=<n>` | 站内 `/chart`、`/track`、`/video`、封面接口 | 否 | 无 |
| 在线只读（从谱面页进入） | 同上 | `SongPage` 的「在 Edit 中打开」只带当前难度 | 否 | 无 |

- 路由不受登录保护：编辑器只在浏览器本地读写文件，不依赖账号。
- 在线只读用 `?level=` 指定初始难度；该难度为空时回退到第一个有内容的难度，再回退到 MASTER（索引 4）。
- 只读模式隐藏“文件/编辑”菜单，只保留「返回谱面页」「BPM Tap」「快捷键」和只读徽标。
- `SiteMascot` 在 `/editor` 不挂载：编辑器要整屏，左下角就是判定盘。

## 3. 数据模型

### 3.1 maidata 字段

| 字段 | 粒度 | 编辑器入口 | 说明 |
|---|---|---|---|
| `&title` / `&artist` | 全局 | 谱面信息窗 | 页面标题、媒体元数据 |
| `&first` | 全局 | 中栏 First | 播放器另有「First 偏移」设置，只存本地，不写文件 |
| `&first_N` | 逐难度 | 不提供编辑 | 解析时优先于 `&first`：`first_{n+1} ?? first` |
| `&lv_N` | 逐难度 | 中栏「难度」 | 文本，允许 `13+` 这类写法 |
| `&des_N` | 逐难度 | 中栏「制谱人」 | 与 `inote_N` 同号（1-based） |
| `&des` | 全局 | 谱面信息窗「谱师」 | 与 `des_N` 并存；预览不消费 |
| `&inote_N` | 逐难度 | **编辑器主体** | 编辑器只放这一段的正文 |
| 其它 `&k=v` | 全局 | 谱面信息窗 | 通用字段列表；`inote_*` 和结构化字段不在这里重复 |

`N = level + 1`，即 `EASY→1 … UTAGE→7`。

### 3.2 内存模型

```
maidata: string          整份文件原文（保存时的唯一真源）
origin: string           上次保存/打开时的 maidata 快照，用于判脏
active: 0..6             当前难度
draft[i]: string         第 i 个难度的 Monaco model（切页签不丢）
dirty.perLevel[i]: bool  第 i 个难度相对 origin 有改动
dirty.global: bool       title / artist / first 有改动
anyDirty: bool           any(perLevel) || global
firstDraft: string|null  First 输入框正在输入中的文本；null 时显示文件里的值
speed: number            播放倍速（受控传给 MajView）
```

- `maidata` 是唯一真源；Monaco 只持有“当前难度那一段”的 model，改文本时通过
  `setDifficultyText(prev, level, text)` 把值区间替换回整份 `maidata`。
- `origin` 在打开文件夹/在线谱面/保存成功时更新。
- `initialTexts` 是打开文件夹那一刻七个难度的文本，`SimaiCodeEditor` 用它懒创建 model；
  每个 model 有自己的撤销栈。

### 3.3 脏状态

```ts
dirty.perLevel[i] =
  getDifficultyText(maidata, i) !== getDifficultyText(origin, i)
  || getLevel(maidata, i) !== getLevel(origin, i)
  || getDesigner(maidata, i) !== getDesigner(origin, i);

dirty.global = ['title', 'artist', 'first'].some(
  (key) => getField(maidata, key) !== getField(origin, key),
);

anyDirty = dirty.perLevel.some(Boolean) || dirty.global;
```

| 位置 | 显示 |
|---|---|
| 难度页签 | 该难度脏 → 名字后加 `*`（`MASTER *`），`aria-label` 为「有未保存改动」 |
| 右上角胶囊 | `anyDirty` → 琥珀色「未保存」；否则绿色「已保存」 |
| 在线只读 | 蓝色「在线谱面 · 只读」，不显示已保存/未保存 |
| 关闭/刷新 | `anyDirty` 时注册 `beforeunload`，浏览器弹通用确认框 |
| 打开/新建 | 有脏时先弹「保存 / 不保存 / 取消」 |

> 注意：`dirty.global` 只比较 `title` / `artist` / `first`。通过谱面信息窗新增或修改其它
> `&k=v` 字段时，`maidata` 确实变了，但「未保存」胶囊可能仍是绿色。见 §11。

### 3.4 保存流程

```
用户 Ctrl+S / 文件 → 保存 / 未保存确认框的“保存”
        │
        ├─ folder.save 存在 ──▶ createWritable() → write(maidata) → close()
        └─ 不存在（webkitdirectory 回退）──▶ 下载 maidata.txt
        │
        ├─ setOrigin(maidata)          清脏
        └─ clearDraft(folder.name)     草稿没有存在意义
```

- 保存是**整份写回**，不是只写当前难度。
- `readOnly` 或没有 folder 时直接忽略（详细日志里记「保存被忽略」）。
- 保存期间 `saving=true`，菜单里的「保存」禁用。
- 保存成功后 `origin` 更新，所有页签的 `*` 和右上角胶囊一起消失。
- 在线只读没有 `save`，保存入口不出现；`Ctrl+S` 在只读模式直接 return。

### 3.5 自动保存（草稿）

自动保存**不是保存**：它只把整份 `maidata` 放进 IndexedDB，防止误关页面；脏状态不清零。

| 项 | 值 |
|---|---|
| 数据库 | `majdata-editor`，object store `drafts`，版本 1 |
| 键 | 文件夹名 `folder.name`（在线只读不写） |
| 值 | `{ maidata: string, savedAt: number, active: number }` |
| 触发 | 编辑停止 **5 秒**后 debounce；另外每 **30 秒**兜底一次 |
| 清除 | 保存成功时 `clearDraft(folder.name)` |
| 恢复 | 打开本地文件夹后 `readDraft`；`draft.maidata !== folder.maidata` 且 `draft.savedAt > folder.modifiedAt` 时 `window.confirm` 询问 |
| 只读 | 不写、不恢复 |

- 恢复时 `setMaidata(draft.maidata)` 并 `setActive(draft.active)`。
- 自动保存失败（无痕模式、存储被禁）静默跳过，不影响编辑。
- 草稿键只有文件夹名：两个同名但路径不同的文件夹会互相覆盖；见 §11。

### 3.6 空模板

`blankMaidata()`：

```
&title=
&artist=
&first=0
&inote_1=
&inote_2=
&inote_3=
&inote_4=
&inote_5=
&inote_6=
&inote_7=
```

新建时要求文件夹里已有 `track.ogg` 或 `track.mp3`；如果已经有 `maidata.txt`，拒绝新建并提示直接打开。
（没有 File System Access 的回退路径直接建一个未命名的空谱面，不检查 track。）

## 4. 架构

### 4.1 组件树

```
EditorPage
├─ Helmet（标题）
├─ header.editor-menubar
│  ├─ brand / 文件菜单 / 编辑菜单 / 设置 / BPM Tap / 快捷键
│  ├─ editor-spacer
│  └─ 保存胶囊 或 只读徽标
├─ 空状态（!folder）
│  └─ 打开文件夹 / 选择器卡住提示 / 错误
├─ main.editor-main（folder）
│  ├─ section.editor-stage
│  │  ├─ MajView（chartText=maidata）
│  │  ├─ 空难度提示
│  │  ├─ 打开失败浮层
│  │  └─ 选择器卡住提示
│  └─ section.editor-side
│     ├─ DifficultyTabs
│     ├─ div.editor-controls
│     │  ├─ 时钟 / 难度 / 制谱人 / First / 播放速度
│     │  ├─ 文本跟随 / 显示判定区 / 隐藏 all note
│     │  └─ ■ / ▶⏸
│     ├─ div.editor-editor
│     │  ├─ SimaiCodeEditor（Monaco，按 folder.name 重建）
│     │  └─ 编译错误提示
│     └─ div.editor-timeline（MajView portal 进来的波形时间轴）
├─ EditorWindow（BPM Tap / 设置 / 快捷键 / 谱面信息）
├─ EditorContextMenu（右键 / `=`）
└─ 未保存确认框（editor-confirm）
```

### 4.2 模块职责

| 模块 | 职责 |
|---|---|
| `src/pages/EditorPage.tsx` | 页面状态、菜单、快捷键、脏状态、保存、自动保存、与 MajView 的接线 |
| `src/hooks/useChartFolder.ts` | 选目录、读 `maidata` / 媒体、写回或下载、在线只读、错误与选择器卡住提示 |
| `src/components/editor/DifficultyTabs.tsx` | 七个常驻难度页签 + 脏标记 + 空档位压暗 |
| `src/components/editor/SimaiCodeEditor.tsx` | Monaco 实例、每难度 model、右键/`=`、Ctrl+点击 |
| `src/components/editor/EditorContextMenu.tsx` | 右键菜单：镜像 5 项 + 撤销/重做；键盘导航 |
| `src/components/editor/EditorWindow.tsx` | 浮动窗外壳：居中、可拖标题栏、无遮罩 |
| `src/components/editor/ChartInfoWindow.tsx` | 草稿式编辑 `title` / `artist` / `des` / 其它 `&k=v` |
| `src/components/editor/BpmTapWindow.tsx` | BPM Tap：相邻点击间隔换算，>20 个去掉最小/最大 |
| `src/utils/maidataEdit.ts` | 按“值区间”读写字段，保留其它字节 |
| `src/utils/simaiTimeline.ts` | 播放时间 ↔ 逗号格子 ↔ 行列位置 |
| `src/utils/simaiMirror.ts` | 五种镜像/旋转的文本变换 |
| `src/utils/autosave.ts` | IndexedDB 草稿读写与“是否提示恢复” |
| `src/utils/editorLog.ts` | `?debug=1` 详细日志、用户手势快照 |
| `src/components/song/monacoSimai.ts` | simai 语言、Monarch 规则、`majdata` 主题、worker |
| `src/utils/simaiMonarch.ts` | simai token 规则（颜色与时间轴一致） |

### 4.3 状态归属

| 状态 | 归属 | 生命周期 |
|---|---|---|
| `folder` / `maidata` / `origin` / `active` | `EditorPage` | 整页 |
| 每个难度的文本 model、撤销栈 | `SimaiCodeEditor` | 按 `folder.name` 重建；切页签保留 |
| 播放/音频/画面/视频 | `MajView` | 按 `folder.name` + `level` 重载 |
| 播放器设置 | `MajViewSettings` + `localStorage` | 跨页面 |
| 编辑器草稿 | IndexedDB | 跨刷新 |
| 浮动窗开关 | `EditorPage` | 整页 |

### 4.4 数据流

```
Monaco onChange(level, text)
  → setDifficultyText(maidata, level, text)
  → maidata 变化
     ├─ MajView chartText 热替换：编译 → Board / Transport.setChart
     ├─ buildTimeline 重算：光标 ↔ 时间映射
     ├─ dirty 重算：页签 * / 保存胶囊
     └─ 自动保存：5s debounce / 30s 兜底

MajView onTime(seconds)
  → 时钟（整秒刷新）
  → 文本跟随（开启且播放中）：positionAt → 移动 Monaco 光标

Monaco 光标移动
  → caretPos → caretTime = timeAtPosition
  → 时间轴顶部黄色三角

时间轴拖动
  → MajView seek + scratch
  → onTimelineScrub(seconds) → positionAt → 移动光标
  → 松开 onTimelineScrubEnd → 焦点还给编辑器
```

## 5. 布局

### 5.1 桌面（横屏）

```
┌──────────────────────────────────────────────────────────────┐
│ editor-menubar 36px：Majdata Edit｜文件｜编辑｜设置｜BPM｜快捷键  保存 ● │
├───────────────────────────────┬──────────────────────────────┤
│ editor-stage                  │ editor-side                  │
│                               │ ┌──────────────────────────┐ │
│  ┌─────────────────────────┐  │ │ DifficultyTabs（7 个）     │ │
│  │                         │  │ ├──────────┬───────────────┤ │
│  │      MajView 判定盘      │  │ │ 控制列    │ Monaco 编辑器  │ │
│  │      （实时预览）        │  │ │ 时钟/难度 │               │ │
│  │                         │  │ │ 制谱人    │               │ │
│  │                         │  │ │ First     │               │ │
│  └─────────────────────────┘  │ │ 倍速/开关 │               │ │
│                               │ │ ■ ▶/⏸     │               │ │
│                               │ ├──────────┴───────────────┤ │
│                               │ │ 波形时间轴（portal）       │ │
│                               │ └──────────────────────────┘ │
└───────────────────────────────┴──────────────────────────────┘
```

- 菜单栏固定 36px；主体 `grid-template-columns: minmax(320px, 46fr) 54fr`。
- 侧栏 `grid-template-columns: 152px 1fr`，行 `auto 1fr auto`：
  页签跨两列、控制列在左、Monaco 在右、时间轴跨两列贴底。
- `.editor-app` 是 `position: fixed; inset: 0`，脱离站点固定页头，铺满整屏。
- 预览区是深色径向渐变；MajView 撑满整格。

### 5.2 竖屏 / 窄屏

`@media (orientation: portrait), (max-width: 820px)`：

```
菜单栏（可换行）
判定盘（32vh，至少 150px）
难度页签
控制列 → 横向可滚工具条
Monaco 编辑器
波形时间轴
```

- 控制列从竖排改为横向 `overflow-x: auto`，字段 `flex: 0 0 auto`。
- 浮窗和确认框限制在视口内；快捷键窗两列变窄。
- 特别矮的横屏（`max-height: 460px`）把时间轴压到 4rem，左右各占一半。

### 5.3 CSS 类

| 类 | 作用 |
|---|---|
| `.editor-app` | 整屏 grid（菜单栏 + 主体） |
| `.editor-menubar` / `.editor-top-item` / `.editor-menu` | 菜单栏和下拉菜单 |
| `.editor-save.is-saved` / `.is-dirty` | 右上角保存胶囊 |
| `.editor-readonly-badge` | 在线只读徽标 |
| `.editor-empty` / `.editor-open-button` | 空状态 |
| `.editor-main` / `.editor-stage` / `.editor-side` | 主体两栏 |
| `.editor-tabs` / `.editor-tab` / `.editor-tab-dirty` / `.is-empty` | 难度页签 |
| `.editor-controls` / `.editor-field` / `.editor-toggle` / `.editor-playback` | 中栏控件 |
| `.editor-editor` / `.editor-code` / `.editor-chart-error` | Monaco 和错误提示 |
| `.editor-timeline` | 时间轴 portal 宿主 |
| `.editor-window` / `.editor-window-head` / `.editor-window-body` | 浮动窗 |
| `.editor-context-menu` | 右键菜单 |
| `.editor-confirm` / `.editor-confirm-box` | 未保存确认框 |

## 6. 交互逻辑

### 6.1 菜单栏

| 菜单 | 项 | 快捷键 | 行为 |
|---|---|---|---|
| 文件 | 新建 | — | 有脏 → 确认；选目录；要求有 track、不能已有 maidata；写空模板并打开 |
| 文件 | 打开文件夹… | `Ctrl+O` | 有脏 → 确认；选目录；读文件；失败显示原因 |
| 文件 | 保存 | `Ctrl+S` | 写回 `maidata.txt` 或下载；清脏、清草稿 |
| 编辑 | 水平镜像 | — | 只作用于 Monaco 选区；无选区时禁用 |
| 编辑 | 垂直镜像 | — | 同上 |
| 编辑 | 180° 镜像 | — | 同上 |
| 编辑 | 旋转 +45° | — | 同上 |
| 编辑 | 旋转 −45° | — | 同上 |
| 编辑 | 谱面信息… | — | 打开草稿式浮窗；确定才写回 |
| 编辑 | 查找替换 | — | 调 Monaco 的 `actions.find`；需要单独注册 findController |
| 设置 | 设置 | — | 复用 `MajViewSettings`，portal 进 `EditorWindow`；只写 localStorage |
| — | BPM Tap | — | 非模态浮窗 |
| — | 快捷键 | — | 只读说明窗 |

- 文件/编辑菜单点外面收起；菜单内 `pointerdown` 阻止冒泡，不会误关。
- 菜单项按上下文禁用：没有文件夹时保存/谱面信息/查找禁用；没有选区时五个变换禁用；`busy` 时新建/打开禁用。
- 只读模式没有文件/编辑菜单；`Ctrl+S` / `Ctrl+O` 被忽略。
- 早期规格里的 `Ctrl+J/K/L/U/I` **没有绑定**（Chrome 的 `Ctrl+J` 会被浏览器保留，其余和 Monaco 键位冲突）；变换请用菜单或右键菜单。

### 6.2 难度页签

- 七个档位常驻：`EASY / BASIC / ADVANCED / EXPERT / MASTER / RE:MASTER / UTAGE`。
- 点击只改 `active`：换 Monaco model、换预览难度；**不提示保存**，各难度文本留在内存。
- 该难度有改动 → 名字后 `*`；该难度还没有内容 → 文字压暗。
- 每个难度独立撤销栈（Monaco model 级别）。
- 打开文件夹时：URL 的 `?level=` 优先（且该难度有内容），否则第一个有内容的难度，否则 MASTER。
- 在线只读同样按 `?level=` 选初始难度。

### 6.3 中栏控件

| 控件 | 写入 | 触发 | 说明 |
|---|---|---|---|
| 时钟 `1:17` | — | 播放时间回调 | 只按整秒刷新，避免每帧重渲染整页 |
| 难度 | `&lv_N` | `onChange` | 每个字符都写回；允许 `13+`；只读时禁用 |
| 制谱人 | `&des_N` | `onChange` | 每个字符都写回；只读时禁用 |
| First | `&first` | `onChange` + 失焦 | 数字框，`step=0.01`；输入合法且非空才写；清空不写 0；失焦丢弃草稿、显示文件真值 |
| 播放速度 | 内存 `speed` | `onChange` | 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2×，受控传给 MajView |
| 文本跟随 | 内存开关 | checkbox | 播放中把光标移到当前音符；详见 §6.5 |
| 显示判定区 | 内存开关 | checkbox | `judgeArea \|\| holdCtrl`；按住 Ctrl 临时打开 |
| 隐藏所有 note | 内存开关 | checkbox | `hideNotes \|\| holdShift`；按住 Shift 临时隐藏 |
| ■ | — | click | 发 `command={type:'stop'}`：暂停并回起点 |
| ▶ / ⏸ | — | click | 发 `command={type:'playPause'}`；图标跟随 `playing` |

- 这些控件都不写 localStorage（播放器设置除外），关闭页面即丢。
- `First` 的显示值来自 `firstDraft ?? String(firstValue)`；`firstValue = getFirst(maidata)`（全局 `&first`）。
- 按住 Ctrl / Shift 的监听在 `window` 上，失焦时复位，checkbox 也会显示成勾上。

### 6.4 编辑区（Monaco）

**model 生命周期**

- 每个难度一个 `monaco.editor.ITextModel`，首次切到该难度时用 `initialTexts[level]` 创建。
- 切难度 `setModel`；组件卸载时 `dispose` 所有 model 和编辑器。
- 因为 model 各自独立，撤销/重做不会串难度。

**文本变化**

- `onDidChangeModelContent` → `onChange(active, editor.getValue())` → `setDifficultyText`。
- 没有防抖：每次输入都改 `maidata`，由 MajView 侧合并重编译（见 [view.md](view.md) §5.3）。
- 编译失败时预览保留上一版，编辑器底部显示「谱面有误：…」；错误消失后提示自动移除。

**输入法**

- 谱面文本是 ASCII 的 simai；编辑器**不再拦截输入法组词**，中文/日文输入法会把候选词直接插进谱面。
- 打谱时请使用英文输入法；要写注释也建议用英文，避免解析器把非 ASCII 字符当成谱面内容。
- 误输入用撤销 / 删除处理；编辑器不会替你清掉非 ASCII 字符。

**右键菜单与 `=`**

- Monaco 自带右键菜单关闭（`contextmenu: false`）；`.editor-code` 的 `onContextMenu` 把屏幕坐标上报给页面。
- 菜单顺序：水平 / 垂直 / 180° / +45° / −45° / 撤销 / 重做。
- 打开后菜单自己拿焦点：默认落在第一个可用项上（没有选区时跳过灰掉的镜像），`↑/↓` 在可用项间移动，`Enter` / `Space` 执行，`Esc` 收起并把焦点还给编辑器。
- 没有选区时五个镜像项灰掉；撤销/重做始终可用。
- 在编辑器里按 `=`：通过 Monaco keybinding 打开同一个菜单（不插入 `=`），位置在光标下方。
- `=` 只在编辑区生效；焦点在别的输入框时正常输入。

**查找替换**

- 从菜单「查找替换」调用 `editor.getAction('actions.find')?.run()`，然后 `focus()`。
- 需要额外 import `monaco-editor/editor/contrib/find/browser/findController.js` 和 `monaco-codicon/codicon.css`，否则按钮图标是空白方块。

**Ctrl+点击 / Ctrl+方向键**

- `Ctrl/Cmd + 点击`： Monaco 先把光标挪到点击处，`setTimeout(0)` 后读位置，收起选区，再 `timeAtPosition` 跳到那一刻。
- `Ctrl/Cmd + ←/→`：按**逗号格子**移动，不是按字符；`→` 下一格、`←` 上一格，然后跳时间。
- `Ctrl/Cmd + ↑/↓`：按**行**跳；保持列（目标行更短就贴行尾），落到那一行后跳时间。
- 这两组键在编辑器里由 `editor.addCommand(KeyMod.CtrlCmd | KeyCode.*Arrow)` 注册，盖掉 Monaco 自带的「Ctrl+上下 = 滚动」「Ctrl+左右 = 按词移动」；焦点在编辑器外面时由页面级 `keydown` 兜底，并按 `defaultPrevented` 跳过，保证一次按键只跳一次。
- 光标跳完正停在逗号后时，向左要从前两个字符开始找，否则原地不动（代码里有 `offset >= 2` 的处理）。

**空格**

- 页面级 `Space` 被截获为“播放 / 回起点”；在编辑器里正常输入空格要用 **`Shift + Space`**。
- `Ctrl + Space` 是播放/暂停；`Shift + Space` 直接放行给 Monaco。

### 6.5 波形时间轴

时间轴由 `MajView` 通过 portal 挂到 `.editor-timeline`，逻辑仍属于播放器；编辑器只给宿主和回调。

**格子模型**

- 粒度是**逗号格子**，不是音符：`1,,2` 中间的空格子也有自己的时间。
- `buildTimeline(fumen, offset)` 用 `parseChart` 的 `commaTimings`（每个逗号一条，末尾格子也有一条）配时间；
  按逗号切格子，取每个格子第一个非空白字符的行列；空格子取格子起点。
- 注释行 `||...` 先替换成空格，保留换行和列位置。
- 解析失败或没有格子返回 `null`；格子数和 `commaTimings` 对不上时按较短的算，避免整体错位。
- `positionAt(timeline, seconds)`：时间 → 行/列；`timeAtPosition(timeline, line, column)`：光标 → 时间。
  两者对每个格子（含空格子）往返一致。

**光标三角**

- 时间轴顶部黄色小三角 = `caretTime`（文本光标所在格子的时间），不是播放位置。
- 播放头是固定在中间的红色竖线。
- 光标时间落在窗口外时，三角钉在对应一侧的边缘，并在最边上加一条短竖线提示方向。

**拖动**

- `pointerdown`：暂停播放、`context.resume()`（借用户手势恢复 AudioContext）、开始记录起点与 `secondsPerPixel`。
- `pointermove`：`seek` 到目标时间；按手速调 `Transport.scratch(time, rate)` 播 0.03s 片段（DJ 搓碟）；`onTimelineScrub(seconds)` 把光标移到对应格子。
- `pointerup` / `cancel`：`stopScratch()`，`onTimelineScrubEnd()` 把焦点还给编辑器。
- 时间轴是唯一在编辑器里能拖动定位的地方（判定盘手势在编辑器关闭）。

**缩放**

- `+` / `−` 按钮：`timelineZoom` 0.1–10，默认 **4**（中线两侧各 4 秒）。
- 数字是“中线两侧各显示多少秒”，所以 `+` 是缩小窗口（放大内容）。
- `+` / `−` 按钮在 `.majview-zoom` 里，拖动时不会被当成时间轴拖动。

**文本跟随**

- checkbox「文本跟随」开启且正在播放时：`onTime` 每个音符变化就 `positionAt` → 移动光标。
- 不是按秒跟随，避免明显滞后；`followKeyRef` 去重，同一位置不重复移动。
- 光标移动本身**不会**自动 seek；只有 `Ctrl+点击`、`Ctrl+左右`、时间轴拖动会跳时间。

### 6.6 播放控制

编辑器不显示 MajView 自带控制条，只通过 `command` 和 `seekTo` 驱动：

| 命令 / 属性 | 发送方 | MajView 行为 |
|---|---|---|
| `command={type:'playPause'}` | ▶/⏸ 按钮、`Ctrl+Space` | `togglePlay()`：播放↔暂停 |
| `command={type:'stop'}` | ■ 按钮 | `stopAndRewind()`：暂停并 `seek(begin)` |
| `command={type:'playOrRewind'}` | `Space` | 播放中→暂停并回到本轮起点；未播放→记录当前位置并开始播 |
| `seekTo={seconds,key}` | `Ctrl+点击`、`Ctrl+左右` | `seek(max(begin, seconds))`，同一位置重复点击也能再跳 |
| `rate` | 中栏下拉框 | 受控套用到 `Transport` |
| `onPlayingChange` | — | 图标 ▶ / ⏸ |
| `onTime` | — | 时钟 + 文本跟随 |

- `playOrRewind` 的“本轮起点”是按下播放那一刻的位置；再次按空格跳回这里并暂停。时间轴底部用红色三角标出。
- `stop` 是“暂停 + 回起点”，和 Song 页的 `togglePlay` 语义不同。
- 编辑器没有全局方向键快进、没有音量快捷键、没有判定盘手势；这些只在 Song 页开启。

### 6.7 浮动窗

统一外壳 `EditorWindow`：

- 固定定位，初次渲染居中；内容尺寸变化（比如设置面板 portal 进来）用 `ResizeObserver` 重新居中；
- 拖动标题栏移动，拖过之后不再自动居中；标题栏上的关闭按钮不触发拖动；
- **没有遮罩**：窗开着时编辑器照常能点、能输入；
- `role="dialog"` + `aria-label`；关闭按钮有 i18n 文案；
- 宽度由调用方给：设置 340、谱面信息 560、快捷键 460、BPM 212（默认）。

| 窗 | 关闭 | 说明 |
|---|---|---|
| BPM Tap | 标题栏 × | Tap 按钮显示当前 BPM；相邻点击 <50ms 忽略；>20 个去掉最小和最大后取平均；Reset 清空 |
| 设置 | 标题栏 × / 面板内 Esc | 设置面板 portal 到窗内；隐藏自己的标题和关闭按钮避免重复。焦点在数字框里时 Esc 只撤销这次输入（不关窗），焦点在面板其它位置才关窗 |
| 谱面信息 | 标题栏 × / 取消 | 所有编辑先写草稿；「确定」才 `onApply(draft)`；「取消」丢弃 |
| 快捷键 | 标题栏 × | 只读说明，内容来自 `SHORTCUTS`：`Space` 播放/回起点、`Ctrl+Space` 播放/暂停、`Shift+Space` 输入空格、`Ctrl+←/→` 按逗号格子跳、`Ctrl+↑/↓` 按行跳、`Ctrl+点击` 跳到点击处、`Shift+←/→` 选区、`=` 打开菜单、`Ctrl+S` 保存、`Ctrl+O` 打开文件夹、按住 `Ctrl`/`Shift` 的临时效果 |

### 6.8 打开、新建、在线只读

**打开文件夹**

1. `showDirectoryPicker({ mode: 'readwrite' })`；用户取消（`AbortError`）安静返回；其它错误显示原因。
2. 按固定顺序尝试读文件（见 §9）；没有 `maidata.txt` → 报错，不静默。
3. 媒体转 object URL；`folder` 一次性替换；释放上一份 URL。
4. 触发 `folder` effect：`setMaidata` / `setOrigin`、选初始难度、重置时间。
5. 非只读时读草稿，按 §3.5 决定是否恢复。

**新建**

1. 选目录；要求存在 `track.ogg` / `track.mp3`；已有 `maidata.txt` 则拒绝。
2. `blankMaidata()` 写入 `maidata.txt`（`create: true`）。
3. 重新读目录、装入文件夹。
4. 没有 File System Access 时直接创建“未命名谱面”，不检查 track。

**在线只读**

1. `?id=` → `openOnline(id)`：`loadChartText(<prefix>/chart)`。
2. `folder` 的媒体地址直接用接口：`/track`、`/video`、封面。
3. `save: null` → `readOnly=true`；Monaco 只读；难度/制谱人/First 输入禁用；文件/编辑菜单隐藏。
4. 「返回谱面页」回 `/song?id=...`；BPM Tap / 快捷键仍可用。

**未保存确认**

- `requestAction(action)`：没有脏直接执行；有脏先弹确认框。
- 「保存」分支：**先** `chooseFolder()`（必须在用户手势里），再 `save()`，最后 `action(dir)`。顺序反了会让 Chrome 因为手势过期而不弹目录选择器。
- 「不保存」：直接执行；「取消」：什么都不做。
- 确认框 `role="dialog" aria-modal="true"`，`Esc` 取消，默认焦点在「取消」。

### 6.9 编辑器里的“错误不静默”

| 场景 | 表现 |
|---|---|
| 打开文件夹失败 | 空状态或判定盘浮层显示原因；`SecurityError` 给“需要重新点击”的提示 |
| 选择器 8 秒没结果 | `pickerSlow`：提示可能被其它窗口挡住 + 「取消」放弃等待 |
| 没有 `maidata.txt` | 「缺少 maidata.txt」 |
| 新建时没有 track | 「缺少 track.ogg / track.mp3」 |
| 新建时已有 maidata | 「文件夹里已有 maidata.txt，请直接打开」 |
| 谱面编译失败 | 编辑器底部错误条；预览保留上一版 |
| 保存被忽略（只读/无 folder） | 详细日志 `[MajdataEdit][editor] 保存被忽略` |

## 7. 控件绑定总表

### 7.1 页面级键盘

监听在 `window`。`Space` / `Ctrl+Space` / `Ctrl+方向键` 会跳过输入框（Monaco 的 `native-edit-context` 不算输入框，所以编辑区里空格仍然触发播放）；`Ctrl+S/O` 不检查焦点，输入框里也会触发。`readOnly` 只屏蔽保存/打开。`Ctrl+方向键` 在编辑器里由 Monaco 命令先处理，页面级只兜底焦点在外面的情况。

| 输入 | 动作 | 条件 | 实现 |
|---|---|---|---|
| `Ctrl/Cmd + S` | 保存 | 非只读（无 folder 时 no-op） | `save()`；`preventDefault` 拦浏览器「保存网页」 |
| `Ctrl/Cmd + O` | 打开文件夹 | 非只读 | `handleOpen()`；有脏先确认 |
| `Space` | 播放 / 回起点 | 焦点不在 input/textarea/select/contentEditable；未被 `preventDefault` | `command='playOrRewind'` |
| `Ctrl/Cmd + Space` | 播放 / 暂停 | 同上 | `command='playPause'` |
| `Shift + Space` | 输入空格 | — | 直接放行给 Monaco |
| `Ctrl/Cmd + ←/→` | 按逗号格子移动光标并跳时间 | 非 `Alt`；有 model | `→` 下一格、`←` 上一格；`setPosition` + `timeAtPosition` |
| `Ctrl/Cmd + ↑/↓` | 跳到上一行 / 下一行并跳时间 | 非 `Alt`；有 model | 保持列（超出贴行尾）；`getOffsetAt` + `setPosition` + `timeAtPosition` |
| `Shift + ←/→` | 扩展 / 收缩选区 | 焦点在 Monaco | Monaco 默认行为；镜像只作用于选区 |
| `Ctrl/Cmd + 点击` | 跳到点击处所在格子的时间 | 在 `.editor-code` 内 | capture 阶段记录，`setTimeout(0)` 后读位置 |
| 按住 `Ctrl/Cmd` | 临时显示判定区 | 整页 | `holdCtrl` → `judgeArea \|\| holdCtrl` |
| 按住 `Shift` | 临时隐藏所有 note | 整页 | `holdShift` → `hideNotes \|\| holdShift` |
| `=` | 在光标处打开编辑菜单 | 焦点在 Monaco | `editor.addCommand(KeyCode.Equal)` |
| 右键 | 打开编辑菜单 | 在 `.editor-code` 内 | 关闭 Monaco 自带菜单，上报屏幕坐标 |
| `Esc` | 关闭右键菜单 / 确认框 / 设置面板 | 对应组件有焦点 | 右键菜单 / 确认框 / `MajViewSettings` 各自处理 |

### 7.2 编辑菜单里的鼠标动作

| 控件 | 行为 |
|---|---|
| 菜单按钮 | 点击切换开/关；点外面关闭 |
| 五个变换 | 只在有选区时可用；`editor.executeEdits` 替换选区，单步可撤销 |
| 谱面信息 | 打开草稿窗 |
| 查找替换 | 打开 Monaco 查找控件 |
| 文件：新建/打开/保存 | 见 §6.1 |
| 右键菜单项 | 悬停同步高亮；点击执行；灰项不可点 |

### 7.3 Monaco 内部绑定

| 输入 | 行为 |
|---|---|
| 普通输入 | 立即写回 `maidata` |
| `Ctrl/Cmd + Z` / `Ctrl/Cmd + Y` | Monaco 默认撤销/重做（每个难度独立栈）；macOS 的重做是 `Cmd+Shift+Z`；菜单也提供 |
| `Ctrl/Cmd + F` | Monaco 查找（需要 findController） |
| `↑/↓/←/→` | Monaco 光标移动（不是播放器快进） |
| `Shift + ←/→` | 扩展 / 收缩选区；镜像只作用于选区 |
| `Alt + 点击` | Monaco 多光标（`multiCursorModifier: 'alt'`；Ctrl+点击留给页面） |
| 输入法组词 | 交给 Monaco/浏览器；谱面只应包含 ASCII，打字前切英文输入法 |
| `=` | 页面菜单，不插入字符 |

### 7.4 指针 / 触摸

| 控件 | 动作 |
|---|---|
| 难度页签 | 切换 `active` |
| 中栏输入框 | 输入即写回；First 失焦恢复真值 |
| 播放速度下拉 | 选倍速 |
| 复选框 | 切换开关；按住 Ctrl/Shift 时显示为勾上 |
| ■ / ▶⏸ | 发命令 |
| 时间轴 | 拖动定位 + 搓碟；`+`/`−` 缩放 |
| 浮动窗标题栏 | 拖动窗口；按钮不触发拖动 |
| 右键菜单 | 点击执行；外面点击关闭 |
| 确认框 | 保存 / 不保存 / 取消 |

## 8. 与预览（MajView）的契约

| Prop | 编辑器传值 | 作用 |
|---|---|---|
| `chartText` | `maidata` | 实时谱面；不请求 `chartUrl`，每次变化热替换 |
| `level` | `active` | 取 `inote_{level+1}` |
| `trackUrl` | `folder.trackUrl ?? ''` | 本地 object URL 或接口地址 |
| `videoUrl` | `folder.videoUrl` | 可选 |
| `title` / `artist` | `&title` / `&artist` | 系统媒体元数据 |
| `cover` | `folder.coverUrl ?? Default_Background.png` | 背景兜底 |
| `onTime` | `handleTime` | 时钟 + 文本跟随 |
| `settingsOpen` / `onSettingsOpenChange` / `settingsHost` | 受控 + portal 宿主 | 设置窗 |
| `seekTo` | `{seconds,key}` | Ctrl+点击 / Ctrl+左右跳转 |
| `command` | `{type,key}` | 播放/暂停/停止/回起点 |
| `onPlayingChange` | `setPlaying` | 切换 ▶ / ⏸ |
| `showControls` | `false` | 隐藏播放器自带控制条 |
| `showTimeline` | `true` | 保留波形时间轴 |
| `timelineHost` | `.editor-timeline` | portal 宿主 |
| `caretTime` | `timeAtPosition(...)` | 时间轴顶部黄色三角 |
| `onTimelineScrub` | `handleTimelineScrub` | 拖动时移动文本光标 |
| `onTimelineScrubEnd` | `focusEditor` | 松开后焦点回编辑器 |
| `preloadVideo` | `true` | 谱面就绪就预加载 PV |
| `allowEmptyChart` | `true` | 空难度也能听音乐/看波形 |
| `judgeArea` | `judgeArea \|\| holdCtrl` | 显示判定区 |
| `hideNotes` | `hideNotes \|\| holdShift` | 隐藏 all note |
| `rate` | `speed` | 受控倍速 |
| `onTextError` | `setChartError` | 编译错误显示在编辑器底部 |

**错误/空难度契约**

- `chartText` 编译失败：`onTextError(message)`，预览继续显示上一版；`message=null` 表示恢复。
- 空难度：`allowEmptyChart` 让播放器返回 `EMPTY_CHART`，不当错误；编辑器在判定盘上显示「这个难度还没有谱面」。
- 第一次编译就失败：MajView 内部用 `reloadKey` 走完整加载，避免永远卡在错误态。

## 9. 文件系统与兼容性

### 9.1 文件查找顺序

| 角色 | 顺序 | 缺失时 |
|---|---|---|
| 谱面 | `maidata.txt` | 打开失败（必须） |
| 音轨 | `track.ogg` → `track.mp3` | 可以没有；新建时要求有 |
| 背景 | `bg.jpg` → `bg.png` | 用默认底图/封面 |
| PV | `pv.mp4` → `bg.mp4` | 不挂视频 |

- File System Access 路径按精确文件名 `getFileHandle` 查找；`<input webkitdirectory>` 回退按 `name.toLowerCase()` 比较。
- 所有媒体都 `URL.createObjectURL` 成稳定 URL，只在换文件夹/卸载时释放；换难度不重建 URL。

### 9.2 保存能力

| 浏览器 | 打开 | 保存 |
|---|---|---|
| Chromium（支持 `showDirectoryPicker`） | 可读写句柄 | 原地写 `maidata.txt` |
| Safari / Firefox | `<input webkitdirectory>` 只读 | 下载 `maidata.txt` |

- 浏览器没有“任意目录写文件”的通用权限；这是自动保存放 IndexedDB 的原因。
- `createWritable()` 可能触发权限提示；失败会被 `save()` 的 `finally` 收尾，但当前没有额外的错误 UI（见 §11）。

### 9.3 选择器手势

- `showDirectoryPicker` 必须在用户手势里调用；`await` 保存/alert 之后手势会过期。
- 代码里的应对：
  - “保存后打开”先选目录、再保存、再用已选目录；
  - 新建失败只提示，不自动重弹选择器；
  - 8 秒无结果提示可能被挡住 + 「取消」；
  - `AbortError` 安静取消，其它错误显示原因；
  - `SecurityError` 给“需要重新点击”的文案。
- 对话框被其它窗口挡住属于系统行为，页面只能提示 + 允许放弃等待。

## 10. 异常与降级

| 场景 | 行为 |
|---|---|
| 没有 File System Access | 回退 `webkitdirectory` 只读；保存变下载 |
| 用户取消选择器 | 安静返回，不改当前 folder |
| 浏览器拒绝/句柄失效 | 显示具体原因，不静默 |
| 选择器长时间不返回 | 8 秒提示 + 取消；晚到的 handle 被忽略 |
| 缺少 maidata / track | 明确提示 |
| 草稿比文件新 | 询问是否恢复；恢复后仍算未保存 |
| 保存时权限失败 | `finally` 复位 `saving`；错误由浏览器/控制台呈现（暂无 toast） |
| 只读在线谱面 | 隐藏写入口；Monaco 只读；保存/打开快捷键 no-op |
| 谱面编译失败 | 编辑器底部错误条 + 预览保留上一版 |
| 视频/PV 失败 | 播放器内部重挂一次后隐藏（见 view.md） |
| 关闭页面有脏 | `beforeunload` 浏览器通用确认 |
| IndexedDB 不可用 | 自动保存静默跳过 |

## 11. 已知限制与待办

以下都是当前实现的真实边界，改代码时优先处理：

1. **变换快捷键未绑定**：`Ctrl+J/K/L/U/I` 没有注册。`Ctrl+J` 被 Chrome 保留，页面收不到 keydown；其余和 Monaco 默认键位冲突。变换目前只能走「编辑」菜单或右键菜单。
2. **全局脏只比较三个字段**：`dirty.global` 只看 `title` / `artist` / `first`。通过谱面信息窗修改/新增其它 `&k=v` 时，「未保存」胶囊可能仍显示绿色；保存仍会写回整份 `maidata`。
3. **逐难度 `&first_N` 与时间轴**：预览编译按 `first_{N} ?? first`；编辑器的 `buildTimeline(getDifficultyText(...), getFirst(maidata))` 只传全局 `&first`。如果谱面使用了 `first_N`，光标/时间轴映射会偏移。修法是让 `getFirst` 支持 `level`（或给 `buildTimeline` 传同样的 `first_N`）。
4. **`&des` 与 `&des_N` 两个入口**：中栏写 `des_N`（逐难度），谱面信息窗写全局 `des`。两者都保留，但预览/页面资料只消费 summary；不要误以为它们会互相同步。
5. **草稿键只有文件夹名**：两个同名文件夹会互相覆盖草稿。要更稳妥可以用“目录名 + maidata hash”或让用户确认。
6. **草稿恢复与 Monaco model**：草稿恢复走 `setMaidata`；Monaco 的 model 在打开文件夹时用 `initialTexts` 懒创建。若恢复后编辑区没有立即显示草稿文本，需要重新打开文件夹（后续应在恢复时重建/`setValue` model）。
7. **输入法**：编辑器不拦截组词；中文/日文输入法会把候选词插进谱面。打谱时应使用英文输入法，误输入需手动撤销/删除。
8. **目录选择器**：仅 Chromium 支持；其它浏览器只能只读打开 + 下载，不能原地保存。
9. **保存失败没有 toast**：写文件权限失败时只复位状态，错误主要留在控制台/浏览器提示里。
10. **自动保存不清脏**：这是有意设计（避免用户误以为已写进 `maidata.txt`），不是 bug；页签 `*` 和胶囊会一直保留到真正保存。
11. **没有“另存为 / 导出视频 / 上传”**：本期范围外。
12. **Monaco 主题光标**：`majdata` 主题把光标设成全透明（只读谱面文件页签时代的设计），编辑器 CSS 用 `!important` 补回青色光标并强制 `visibility: visible`；换主题/升级 Monaco 时要回归这一点。

## 12. 测试与验收

| 范围 | 测试 |
|---|---|
| 字段读写 / 保留格式 | `test/utils/maidataEdit.test.ts` |
| 时间轴格子映射 | `test/utils/simaiTimeline.test.ts`（17 个用例，空格子/注释/坏谱面） |
| 镜像 / 旋转 | `test/utils/simaiMirror.test.ts`（角度映射、手性、括号/注释透传） |
| 自动保存判定 | `test/utils/autosave.test.ts` |
| 难度页签 | `test/components/editor/DifficultyTabs.test.tsx` |
| simai 高亮 | `test/utils/simaiMonarch.test.ts` |
| 打开失败 | `e2e/editor-open-failure.spec.ts` |
| First 字段 / 打击音 | `e2e/editor-first.spec.ts`、`e2e/editor-audio-first.spec.ts` |
| 空难度 / 选择器 | 手工验收（`e2e/editor-audio-first.spec.ts` 覆盖音乐与 First 的联动） |
| 手工验收 | 桌面 1440px + 手机 390px：打开/新建/保存、切难度、脏标记、自动保存恢复、时间轴拖动、Ctrl+方向键、Ctrl+点击、右键菜单、输入法（确认不被误拦截）、只读在线谱面 |

改编辑器时至少跑：

```bash
pnpm lint
pnpm test
pnpm build
```

涉及播放器联动或文件系统时再加 `pnpm test:e2e`。

## 13. 参考

- 早期规格与决策：[editor-interaction-spec.md](../analysis/editor-interaction-spec.md)
- 播放器设计：[view.md](view.md)
- 模块连线图：[majview-module-graph.html](../analysis/majview-module-graph.html)
- 变更记录：[docs/changelog](../changelog/)
