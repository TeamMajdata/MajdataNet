# 谱面预览（View）设计文档

> 入口：`/song?id=<chartId>&level=<难度>&tab=<页签>`
>
> 核心链路：`SongPage` → `ChartPreview` → `MajView` → `src/majview/*`
>
> 同一套播放器也被编辑器复用；编辑器侧的用法见 [edit.md](edit.md)。

## 1. 目标与非目标

### 目标

- 在浏览器里直接预览站内谱面，不再依赖独立进程或 Unity WebGL：
  - 谱面判定盘（PixiJS）；
  - 音乐、打击音、开头 clock；
  - 背景图 / 背景 PV；
  - 波形时间轴（编辑器）与物量/连击浮层；
  - 播放器设置持久化。
- 打开页面时先把谱面画出来，**第一次点播放才下载音乐**，避免每次看谱都拉整首歌。
- 播放时间以音频时钟为准：画面、打击音、背景视频、时间轴、系统媒体控件都跟同一个时钟走。
- 手机可用：判定盘正方形、手势操作、系统媒体控件、iOS 后台恢复。
- 与页面解耦：`src/majview` 不认识接口、路由、账号，只接收地址/文本和回调。

### 非目标

- 不做判定、计分、成绩上传；
- 不做谱面编辑（见 Edit 文档）；
- 不处理歌曲上传、评论、排行榜的业务逻辑；
- 不保证所有浏览器/编码格式都能播放（见 §9）。

## 2. 入口与页面组织

### 2.1 路由参数

| 参数 | 必填 | 作用 |
|---|---|---|
| `id` | 是 | 站内谱面 ID；`SongPage` 用它取 summary、谱面文本、音轨、视频和封面 |
| `level` | 否 | 目标难度（0-based）；非法或缺省时由 `getDefaultChartLevel(song.levels)` 选默认难度 |
| `tab` | 否 | 页签：`preview` / `scores` / `overview` / `comments`；不在当前端可用列表里时回退到第一个页签 |
| `comment` | 否 | 要聚焦的评论 ID；评论区会滚动并高亮该评论 |

难度切换写回 `level` 查询参数（`replace`，不重置滚动）。页签切换写回 `tab`。

### 2.2 桌面与手机

| 布局 | 页签 | 播放器位置 | 侧栏 |
|---|---|---|---|
| 桌面（`> 48rem`） | 谱面预览、排行榜 | 工作区顶部，5:3 长方形，最高 `84svh`；评论在播放器下方 | 右侧：难度、谱面资料、ID/HASH、雷达图 |
| 手机（`≤ 48rem`） | 概览、评论、排行榜 | 页面最上方，贴顶栏、横向占满、无圆角；判定盘按宽度做正方形 | 侧栏变成“概览”页签，不再画左边框 |

- 播放器**一直挂载**：切页签不卸载、不重新加载。桌面上切到非预览页签时 `active=false`，播放器暂停但保留状态；手机上播放器不在页签里，始终可见。
- 评论里的时间 / combo 跳转需要播放器报告当前谱面范围，所以播放器不能按页签卸载。
- 桌面页签里“谱面文件”页签已移除；改为播放器下方的「在 Edit 中打开」（只读，见 Edit 文档）。

### 2.3 打开页面时的预取

`SongPage` 拿到 `id` 后立即调用 `preloadMajView(id)`，并行做三件事：

1. `import('./MajView')`：提前拉 PixiJS 代码块；
2. `loadChartText(<prefix>/chart)`：谱面文本进 `chartCache`；
3. `preloadSkin()`：取 `atlas.json` 并把每页图集解码进图片缓存。

`MajView` 本身是 `lazy` 加载的；预取失败不影响正常加载。

## 3. 架构

### 3.1 组件树

```
SongPage
├─ Helmet（标题 / OG / Twitter meta）
├─ SongInfo
│  ├─ header（封面、标题、曲师、难度、操作按钮、标签）
│  ├─ UnderlineTabs（桌面：预览 / 排行榜；手机：概览 / 评论 / 排行榜）
│  ├─ section#song-panel-preview
│  │  └─ ChartPreview
│  │     ├─ 封面兜底图（MajView 加载中 / 无难度时）
│  │     └─ MajView（Suspense + lazy）
│  ├─ section#song-panel-scores → ScoreRanking
│  ├─ 评论区（桌面在播放器下方；手机是独立页签）
│  └─ aside.song-sidebar（桌面）/ 手机“概览”页签
│     ├─ SongDifficultyLevels
│     ├─ song-credits（谱师、上传者、时间、BPM、时长、播放次数）
│     ├─ ID / HASH 复制
│     └─ ChartRadar
├─ TagManageWidget
└─ CollectionModal
```

`ChartPreview` 只做三件事：算封面兜底、拼三个接口地址、把 `active/jump/onMarkRange` 透传给 `MajView`。
播放器“只要三个地址”，不知道 `songId` 也不知道接口长什么样。

### 3.2 MajView 内部结构

```
.majview
├─ img.majview-backdrop                 模糊压暗的封面
├─ div.majview-perf                     ?perf=1 / 设置打开时的诊断卡片
├─ div.majview-stage                    判定盘区域（尺寸容器）
│  ├─ div.majview-counter-top           左上物量 / 达成率
│  ├─ div.majview-counter-bottom        左下分类统计
│  └─ div.majview-scene                 正方形判定盘（min(100cqw, 100cqh)）
│     ├─ div.majview-background
│     │  ├─ img（封面 或 Default_Background）
│     │  ├─ video（PV，可选）
│     │  └─ div.majview-shade           背景暗度
│     ├─ div.majview-combo              连击数
│     ├─ div.majview-board              PixiJS canvas 宿主
│     ├─ div.majview-message            加载/错误提示
│     ├─ div.majview-text-error         编译失败提示（页面不接管时）
│     └─ div.majview-value-hint         音量/亮度拖动时的中央胶囊
├─ 控制条 .majview-controls             可 portal 到页面
│  ├─ MajViewAnalyzer（可选）
│  ├─ 波形时间轴（可选）
│  ├─ input[type=range]                 进度条
│  └─ 播放 / 重播 / 时间 / 倍速 / 设置 / 全屏
└─ MajViewSettings（可选）
```

`.majview-scene` 始终是正方形：宽高都取容器短边。全屏时改成铺满屏幕，控制条变成自动隐藏的浮层。
手机页面用 CSS 把判定盘改成“宽度决定高度”的正方形，绕开 `container-type: size` 在自适应高度下的塌陷问题。

### 3.3 模块职责

| 模块 | 职责 | 关键导出 / 说明 |
|---|---|---|
| `src/majview/simai.js` | MajSimai 3.0.1 的 JS 移植：`readMaidata`、`parseChart`、`compileChart` | `compileChart(fields, level)` 读取 `inote_{level+1}` 和 `first_{level+1} ?? first` |
| `src/majview/renderer.js` | PixiJS 判定盘：皮肤、轨道、note、slide、判定线、物量/连击文字 | `Board.create(host, 'webgl', skinBase, ui)`；`setChart` / `render(time)` / `destroy` |
| `src/majview/audio.js` | Web Audio 播放：音乐、音效排程、时钟、搓碟 | `Transport.load` / `start` / `pause` / `move` / `setChart` / `scratch` |
| `src/majview/timeline.js` | 音效时间表、开头 clock、判定/连击时间线、流速曲线 | `chartStart`、`soundEvents`、`scoreTimeline`、`noteSpeed` |
| `src/majview/visualizer.js` | 波形时间轴绘制（BPM、拍线、逗号刻度、note 标记、光标三角） | `buildWaveform`、`bpmChanges`、`Visualizer` |
| `src/majview/settings.ts` | 播放器设置、默认值、localStorage、旧版迁移、声道增益 | `VIEW_FIELDS`、`loadSettings`、`channelGains` |
| `src/majview/gestures.js` | 判定盘手势参数、拖动进度换算 | `seekTarget`、各类阈值 |
| `src/majview/analyzer.js` | 进度条上方的 64 根谱面密度柱 | 目前没有页面打开 `showAnalyzer` |
| `src/majview/spectrum.js` + `spectrum.worker.js` | 整曲 FFT / Aurora 分频，给波形上色 | 失败时退回纯绿波形 |
| `src/majview/perf.js` | 帧率、渲染耗时、DSP/视频偏差、长任务诊断 | `createPerf`、`perfForced` |
| `src/majview/geometry.js` | 轨道角度、坐标、`clamp` | 镜像的 lane 映射按同一套角度约定推导，渲染和变换共用这套语义 |
| `src/majview/chartCache.ts` | 同一谱面文本的请求合并，最多缓存 8 条 | 失败不缓存 |
| `src/components/song/MajView.tsx` | 生命周期、播放控制、手势/键盘、视频同步、portal | 唯一把引擎接进页面的地方 |
| `src/components/song/MajViewSettings.tsx` | 设置面板 | 滑块 + 数字框 + 开关 |
| `src/components/song/MajViewVisualizer.tsx` | 时间轴画布外壳 | 每帧由 `MajView.frame()` 推进，自己没有 rAF |
| `src/components/song/useMediaSession.ts` | 锁屏 / 控制中心 / 通知栏 | 用静音 `<audio>` 激活系统控件 |
| `src/components/song/preloadMajView.ts` | 谱面页预取 | 页面层策略，不放进引擎 |

**依赖规则**：`src/majview` 不 import 页面、接口、路由、i18n；需要页面知道的事情（接口地址、A/B 页签、编辑器命令）都由 `MajView` 的 props 传进来。

### 3.4 数据流

```
接口 /chart ──▶ chartCache ──▶ readMaidata ──▶ compileChart(fields, level) ──▶ Board.setChart
                                                                                  │
接口 /track ──▶ Transport.load ──▶ AudioBuffer ──▶ Web Audio 排程 ──▶ Transport ──┤
                                                                                  ├─▶ frame() 每帧读 time
接口 /video ──▶ <video> ──▶ syncVideo（±3% 追帧 / 大偏差直接 seek） ────────────────┤
                                                                                  │
localStorage ◀──▶ ViewSettings ──▶ Board.settings / Transport.setSettings ────────┘
```

`chartText` 是编辑器的入口：给了它就不请求 `chartUrl`，每次变化只重编译并热替换 `Board`，
不重载音频、不跳播放位置。

## 4. 数据与时间语义

### 4.1 谱面字段

| 字段 | 作用 | View 是否使用 |
|---|---|---|
| `&inote_N` | 第 N 档谱面正文 | 是；`compileChart` 按 `level` 取 |
| `&first` | 全局整体偏移（秒） | 是；编译进 note 时间 |
| `&first_N` | 逐难度偏移，优先于 `&first` | 是；`first_{N} ?? first` |
| `&lv_N` / `&des_N` | 难度 / 谱师 | 否（页面从 summary 拿） |
| 其它 `&k=v` | 自定义命令 | 原样保留；解析器按需读取 |

### 4.2 三种“偏移”不要混

| 名称 | 面板文案 | 影响范围 | 存哪 |
|---|---|---|---|
| `First 偏移` | First 偏移 | 判定盘音符、打击音；**音乐不动** | `localStorage`（毫秒） |
| `音效偏移` | 音效偏移 | 只影响打击音排程；画面不动 | `localStorage`（毫秒） |
| `&first` | 谱面自带字段 | 编译时写进每个 note 的时间；画面和打击音一起动，音乐不动 | `maidata.txt` |

`Transport` 里对应三个量：`firstOffset`（设置）、`soundOffset`（设置）、note 时间（`&first` 已编译进去）。
`setFirstOffset` / `setChart` 发现时间表真的变了才会 `pause() + start()` 重新排音，避免每次按键都掐断音乐。

### 4.3 `begin`、总长与显示时间

- `begin = chartStart(chart)`：开头四拍 clock 可能落在 0 之前，这时从第一下 clock 开始播；否则从 0 开始。
- `duration = max(歌曲长度, 最后一个 note 结束 + 尾音余量)`；还没加载音频时用谱面估算。
- 时钟显示 `time - begin`，总长显示 `duration - begin`；系统媒体控件、评论时间戳也用这套“界面时间”。
- 进度条的 `min=begin`、`max=duration`；每帧由 `frame()` 直接写 `value`，避免受控更新造成拖动卡顿。

### 4.4 高精度时钟

`Transport.time` 不是直接读 `context.currentTime`：

- 以 DSP 时间为锚点，帧与帧之间用 `performance.now()` 外推；
- 每个音频块收到新的 DSP 值时纠一点偏差；误差超过 50ms 直接对齐；
- 下限是 `begin`（允许负数），上限是 `duration`；
- 这样 144fps 下画面不会每 10ms 才动一次，长期又不会和音频跑偏。

### 4.5 连击与时间跳转

- `scoreTimeline(notes)` 给每个 note 的结束时间配一个累计计数；第 n 个元素结束时 combo 变成 n。
- 评论里的 `kind: 'combo'` 跳到 `scores[value - 1].time + firstOffset + 0.001`，让画面刚好显示这个 combo。
- 评论里的 `kind: 'time'` 跳到 `begin + value`。
- 页面通过 `onMarkRange({ length: duration - begin, maxCombo })` 知道当前谱面的有效范围，用来判断评论里的时间/combo 是否可点。

### 4.6 背景视频同步

`syncVideo()` 每帧把 `<video>` 对齐到播放时间：

| 偏差 | 处理 |
|---|---|
| `> 150ms`（或强制对齐时 `> 15ms`） | 直接改 `currentTime`，并设置 `playbackRate` |
| `20ms – 150ms` | 播放速率 ±3% 慢慢追，避免在阈值边缘反复 seek |
| `< 20ms` | 只保证 `playbackRate` 和播放/暂停状态一致 |

不要正好 seek 到 `video.duration`：Chrome 会把它当成播完，之后再 `play()` 不一定回得来。所以目标时间限制在 `duration - 0.06`。

## 5. 生命周期与状态机

### 5.1 加载/播放状态

```
            ┌──────────── 换难度 / 换地址 / reloadKey ────────────┐
            ▼                                                     │
loading ──谱面编译成功──▶ ready ──第一次点播放且音频未就绪──▶ buffering
   │                        │                                   │
   │                        │                                   ├─ 音频就绪 ──▶ ready（playing）
   │                        │                                   └─ 音频失败 ──▶ ready + error.track
   └─ 编译/渲染失败 ──▶ error（保留封面与错误原因）
```

- `status` 只表示播放器准备到哪一步；`playing` 是独立状态。
- `buffering` 时播放按钮禁用，画面显示「正在加载音乐…」。
- 音频失败后回到 `ready`，显示「音乐加载失败，请再点一次播放重试」；再次点播放会重试 `prepareTrack`。
- `active=false` 且正在播放时暂停；重新变 `true` 不会自动继续。

### 5.2 加载流程

1. **谱面**：`chartText` 存在就直接用；否则 `loadChartText(chartUrl)`（同 URL 请求合并）。
2. **编译**：`compileForView(text, level, allowEmptyChart)`；空难度且允许空时返回 `EMPTY_CHART`。
3. **起播点与总长**：`previewTimeRef = chartStart(compiled)`，`duration = chartDuration(compiled)`。
4. **画面**：`Board.setChart(compiled, settings)`，`status='ready'`，画一帧。
5. **音乐**：`scheduleTrack()` 用 `requestIdleCallback`（不支持则 400ms 定时）延后准备，先保证画面和皮肤不抢带宽。
6. **音频**：`prepareTrack()` 创建/复用一个 `AudioContext`，`Transport.load` 下载并解码音乐和全部音效样本（10 个）。
7. **波形**：解码完成后在主线程算包络（约 10–20ms），频谱颜色交给 Worker。

`Transport.load` 一次加载**全部**音效样本，而不是只加载当前谱面用到的：编辑器新建空谱面后敲进来的 note 也要有声音。

### 5.3 实时谱面热替换（编辑器）

`chartText` 变化时：

1. 若还没有成功编译过一版：先试编译；成功则 `reloadKey++` 走完整加载，失败就继续等下一次输入（错误态可恢复）。
2. 否则编译新文本：
   - 失败：**保留上一版画面**，把错误通过 `onTextError` 报给页面；
   - 成功：`chartRef` / `setChart` 更新，`transport.setChart(compiled)` 更新音效表与总长。
3. `setChart` 只在事件表/`begin`/`duration` 真变时重排音频；只改注释不会重启音乐。
4. 重新排音会先 `pause()` 再 `start()`，所以紧跟着 `syncVideo(true)` 和 `frame()`，避免 PV 看起来“消失”。

### 5.4 视频

- 第一次点播放前不挂 `src`（`preload="none"`），避免打开页面就下载整段视频。
- 编辑器传 `preloadVideo`：谱面一就绪就挂 `src` 预加载，但仍然不主动播。
- `<video>` 出过错后元素可能再也放不出画面：先重挂一次（`videoAttempt`），仍失败才隐藏。
- `showJudge`（显示判定区）时强制用 `Default_Background.png` 并隐藏视频。

### 5.5 后台、锁屏与 WebGL

- **iOS 切后台回来**：跑过的 `AudioContext` 可能报 `running` 但时钟不走。进入后台时记标记；下次点播放时新建 `AudioContext`，用 `adoptDecoded` 把已解码的 `AudioBuffer` 带过去，不重新下载/解码。
- **回到页面时**：如果还在“播放”，看半秒内 `context.currentTime` 有没有走；没走就切回暂停，界面不会卡在播放状态。
- **WebGL 上下文丢失**：`webglcontextrestored` 时重画一帧，暂停时画面不会停在空白。

### 5.6 卸载

- `cancelAnimationFrame`、清理所有手势/控制条/提示定时器；
- `dropTransport()`：abort 音频请求、`transport.dispose()`；
- `board.destroy()`、关闭 `AudioContext`；
- 终止频谱 Worker；
- 清理系统媒体控件、静音 `<audio>` 和 object URL。

## 6. 交互逻辑

### 6.1 播放控制条

| 控件 | 类 / aria | 行为 | 条件 |
|---|---|---|---|
| 播放 / 暂停 | `LuPlay` / `LuPause`，`song/MajView.Play` / `Pause` | `togglePlay()`：播放中→暂停；否则从当前位置播 | `status === 'ready'` |
| 重播 | `LuRotateCcw`，`song/MajView.Restart` | `seek(begin)` | `ready` / `buffering` |
| 进度条 | `input[type=range]`，`song/MajView.Position` | `onChange → seek(value)`；每帧由 `frame()` 更新位置 | 非 `loading` |
| 倍速 | `SortMenu`，`song/MajView.Speed` | 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2×；长按快放时显示 2× | `ready` / `buffering` |
| 设置 | `LuSettings2`，`song/MajView.Settings` | 开/关设置面板；受控时由页面管 | 总是 |
| 全屏 | `LuMaximize`，`song/MajView.Fullscreen` | `requestFullscreen` / `exitFullscreen` | 浏览器支持时 |
| 时间轴 | 见 [edit.md](edit.md) §6.5 | 编辑器专用；默认不显示 | `showTimeline` |
| 谱面密度 | `MajViewAnalyzer` | 进度条上方 64 根柱 | `showAnalyzer`（目前无页面使用） |

- 播放键图标随 `playing` 切换：播放中显示 ⏸，暂停/停止显示 ▶。
- 时间读数每秒才写一次 DOM（`formatClock`），不跟着每帧触发 React 重渲染。
- 倍速改变时 `transport.move(time, rate)`；还没音频时记住速率，第一次播放生效。

### 6.2 键盘（`shortcuts=true`）

Song 页传 `shortcuts`；编辑器**不传**，用页面自己的快捷键（见 [edit.md](edit.md) §6）。
键盘监听在 `window` 上，焦点在 `INPUT` / `TEXTAREA` / `SELECT` / `contentEditable` 时不响应。

| 键 | 播放中 | 暂停 / 停止 | 说明 |
|---|---|---|---|
| `Space` | 暂停 | 从当前位置播放 | 阻止页面滚动 |
| `←` | 松开时后退 5 秒 | 每按一次（含 repeat）后退 0.01 秒 | 播放中 keydown 不动作，避免长按/连发误跳 |
| `→` | 松开时前进 5 秒 | 每按一次前进 0.01 秒 | 播放中按住 450ms 进入 2× 快放，松手恢复 |
| `↑` / `↓` | 总音量 ±0.1 | 同左 | 显示音量胶囊，900ms 后自动收起 |

- 长按右箭头：`LONG_PRESS_MS = 450`；快放只改当前播放速率，不写入设置。
- 暂停时按左右键是“逐帧对位”的 0.01 秒步进；按住可以连续步进。
- 忽略 `event.defaultPrevented`，不抢已经处理过的按键。

### 6.3 判定盘手势（`gestures=true` 且设置里开启手势）

Song 页传 `gestures`；编辑器不传，所以判定盘上没有手势（编辑器用波形时间轴拖动）。
所有手势从 `pointerdown` 开始，只跟踪一根手指；`setPointerCapture` 保证移出判定盘也能收到事件。

| 手势 | 识别条件 | 行为 |
|---|---|---|
| 鼠标单击 | 移动不超过 10px，300ms 内没有第二次 | 等 300ms 确认不是双击后播放/暂停 |
| 鼠标双击 | 两次点击间隔 ≤ 300ms、位置差 ≤ 24px | 切换全屏 |
| 触摸双击 | 同上 | 播放/暂停 |
| 触摸单击（全屏） | 单击且不是双击的第一下 | 显示/收起控制条（2.5s 后自动收起） |
| 触摸长按 | 按住 450ms、没移动 | 播放中临时 2×；暂停时只标记长按，不加速 |
| 横向拖动 | 横向位移 > 14px 且大于纵向 | 拖动进度：先暂停，松手后恢复原播放状态 |
| 纵向拖动（右半边） | 纵向位移 > 12px | 调总音量：200px = 1.0，范围 0–2 |
| 纵向拖动（左半边） | 纵向位移 > 12px | 调背景暗度：200px = 10，范围 0–10 |

- 拖动进度时拖过整个判定盘宽度对应 60 秒；歌比 60 秒短时整首铺满宽度。
- 进度拖动期间画面/PV 实时跟手，时间读数右边显示 `±` 偏移；音量和亮度显示中央胶囊。
- 音量和亮度拖动只改内存值，**松手才写入 localStorage**；进度拖动松手才落定并恢复播放。
- `touch-action`：手势开启时 `none`（不让浏览器接管横向/纵向滑动）；关闭时 `pan-y`（恢复页面竖向滚动）。
- 整个 `.majview` 禁掉文字选择和长按菜单（输入框除外），避免 iOS 上选区落到物量/时间文字上。

阈值常量集中在 `src/majview/gestures.js`，改手感只改那一处，并由 `test/majview/gestures.test.ts` 覆盖。

### 6.4 全屏与控制条自动隐藏

- 进入/退出全屏时控制条强制显示，并重新开始 2.5s 计时。
- 全屏下鼠标移动、点击、按控制条按钮都会“叫出”控制条；2.5s 后隐藏（`data-hidden=true`，同时 `pointer-events:none`）。
- 触摸设备在全屏下用单击切换控制条；双击仍然是播放/暂停。
- iPhone Safari 只允许视频全屏时 `document.fullscreenEnabled` 为假，全屏按钮直接不渲染。

### 6.5 系统媒体控件

`useMediaSession` 用一段和谱面等长的静音 WAV 激活系统媒体控件：

- 元数据：标题、曲师、封面；
- 动作：`play`、`pause`、`seekto`、`seekbackward`、`seekforward`（默认 ±10s）；
- 时间：界面时间（`transport.time - begin`），总长 `duration - begin`；
- `setPositionState` 同步进度与倍速；iOS 的进度条实际读静音 `<audio>` 自己的位置，所以它和谱面等长；
- 第一次 `audio.play()` 必须在用户点击里（`prime()`），和 `AudioContext.resume()` 一起在 `togglePlay` 中完成。

### 6.6 评论里的时间 / combo 跳转

评论组件把可点的 `ChartMark` 通过 `ChartMarkContext` 交给 `SongPage`：

1. `jumpTo(mark)`：`setJump({ ...mark, key: Date.now() })`；桌面切到“谱面预览”页签，并把播放器滚到视口中央。
2. `MajView` 的 `jump` effect 只在 `key` 变化时执行一次：
   - `kind='time'` → `begin + value`；
   - `kind='combo'` → `scores[value - 1].time + firstOffset + 0.001`。
3. `onMarkRange` 告诉页面当前谱面的长度和最大 combo；没有谱面时传 `null`，评论里的时间和 combo 不可点。

同一个位置连续点两次也能再次跳转，因为 `key` 每次都不同。

### 6.7 页签、难度与页面操作

| 控件 | 行为 |
|---|---|
| 难度列表（`SongDifficultyLevels`） | 写 `level` 查询参数（`replace`，不重置滚动）；桌面纵向、手机横向 |
| 页签 | 桌面：预览 / 排行榜；手机：概览 / 评论 / 排行榜。写 `tab` 参数，不卸载播放器 |
| 封面 | `PhotoProvider` 打开大图 |
| 标题 / 曲师 / 标签 | 跳到 `/search?search=...`；作者标签直接搜，公共标签带 `tag:` 前缀 |
| 点赞点踩 / 下载 / 收藏 / 分享 | 见 `ChartVoteBadge`、`downloadSong`、`CollectionModal`、剪贴板复制 |
| 在 Edit 中打开 | 仅在有当前难度时出现；跳到 `/editor?id=<id>&level=<level>`，只读 |
| ID / HASH | 整行点击复制 |
| 管理标签 | 打开 `TagManageWidget` 浮窗 |

### 6.8 设置面板

入口：控制条的齿轮按钮（Song 页），或编辑器菜单（Edit 页，portal 进 `EditorWindow`）。
面板是 `role="dialog"`；焦点在面板内时 Escape 关闭（焦点在数字框里时只撤销这次输入）。改动立即写入 `localStorage`，不需要“确定”。

| 设置项 | 范围 | 默认 | 显示换算 | 作用 |
|---|---|---|---|---|
| `NoteSpeed` | 1–200 | 75 | `/10` → 7.5 | Tap/Hold 流速；改变时重算音符出现时间 |
| `TouchSpeed` | 1–200 | 75 | `/10` → 7.5 | Touch 流速；同上 |
| `Offset` | -500–500 | 0 | 毫秒 | 音效偏移；只影响打击音排程 |
| `FirstOffset` | -500–500 | 0 | 毫秒 | 谱面整体平移；画面和打击音一起动 |
| `BGCover` | 0–10 | 8 | `×10` → 80% | 背景暗度（遮罩透明度） |
| `Master` | 0–2，步长 0.1 | 1 | 倍数 | 总音量；乘在所有声道上 |
| `BGM` | 0–2，步长 0.1 | 1 | 倍数 | 音乐声道 |
| `Answer` | 0–2，步长 0.1 | 1 | 倍数 | Answer 音 |
| `Effects` | 0–2，步长 0.1 | 1 | 倍数 | 打击音总闸，乘在各类打击音上 |
| `Judge` | 0–2，步长 0.1 | 0.7 | 倍数 | Tap / Hold 判定音 |
| `EX` / `Break` / `Touch` / `Hanabi` | 0–2，步长 0.1 | 1 | 倍数 | 对应打击音 |
| `Slide` | 0–2，步长 0.1 | 0 | 倍数 | Slide 音，默认静音 |
| `Combo` | 开/关 | 开 | — | 显示连击数 |
| `Counter` | 开/关 | 开 | — | 显示物量 |
| `Perf` | 开/关 | 关 | — | 显示性能信息（`?perf=1` 可强制） |
| `Gestures` | 开/关 | 开 | — | 面板上是“禁用手势”，存的是“启用手势” |
| `SlideClassic` | 开/关 | 关 | — | Slide 排列顺序：Classic（新的在上） |

- 数字框可以直接输入，回车/失焦提交；超出范围按边界算，非法输入恢复原值；偏移允许负数，所以用完整键盘而不是 iOS 小数键盘。
- 触摸设备上滑块**只允许从滑块头开始拖**：点滑条身体会直接跳到那个值，翻页时容易误触（鼠标不受限）。
- 声道最终增益：`BGM/Answer = 值 × Master`；各类打击音 = `值 × Effects × Master`；时钟 = `Master`。
- 设置面板“恢复默认”调用 `defaultSettings()`，立即写回。

### 6.9 设置迁移

- 当前格式存在 `MajViewSettingsV2`（JSON）。
- 没有 V2 时尝试读旧版 Unity 播放器的 `MajdataSettings`（逗号分隔，14 或 15 项）。
- 只迁移 `NoteSpeed` / `TouchSpeed` / `BGCover` / `Combo`；**偏移和音量不迁移**（旧版偏移是给 Unity 校准的，旧版音量是 dB，换算不可靠）。
- 字段数或数值形状对不上就整份跳过，回退默认值，不猜。
- 迁移实现和测试在 `src/majview/settings.ts` / `test/majview/settings.test.ts`；
  **不要再用 `VIEW_FIELDS` 的下标映射旧串**——`FirstOffset` 插入后曾导致整体错位一格。

## 7. 编辑器复用的部分

View 和 Edit 共用同一个 `MajView`，但传参不同：

| 能力 | Song 页 | Edit 页 |
|---|---|---|
| 谱面来源 | `chartUrl` | `chartText={maidata}`（实时热替换） |
| 控制条 | `showControls=true`（默认） | `showControls=false`，用页面按钮发 `command` |
| 波形时间轴 | 不显示 | `showTimeline` + `timelineHost` portal 到编辑器底部 |
| 设置面板 | 播放器内部浮层 | `settingsOpen` 受控，portal 进 `EditorWindow` |
| 键盘 / 手势 | `shortcuts` + `gestures` | 都不开；快捷键在页面层，拖动在时间轴 |
| 空难度 | 无 | `allowEmptyChart`，给空谱面以听音乐/看波形 |
| 视频 | 点播放才拉 | `preloadVideo`，谱面就绪就预加载 |
| 判定区 / 隐藏音符 | 无（除非以后加） | `judgeArea` / `hideNotes`，可按住 Ctrl / Shift 临时生效 |
| 倍速 | 控制条自己管 | `rate` 受控于中栏下拉框 |
| 编译错误 | 播放器内部提示 | `onTextError` 交给编辑器显示在底部 |

完整契约见 [edit.md](edit.md) §8。

## 8. 异常与降级

| 场景 | 行为 |
|---|---|
| 谱面请求失败 / 解析失败 | `status='error'`，显示「谱面加载失败：<原因>」；保留封面；编辑器侧同时显示在编辑器底部 |
| 音乐请求/解码失败 | 回到 `ready`，显示「音乐加载失败，请再点一次播放重试」；再点播放会重试 |
| 背景视频加载失败 | 先重挂一次 `<video>`；仍失败则隐藏视频，不影响谱面 |
| WebGL 上下文丢失 | `webglcontextrestored` 时重画一帧 |
| 频谱 Worker 失败 | `console.warn` 并终止 Worker；波形退回纯绿色 |
| 浏览器不支持全屏 | 不渲染全屏按钮 |
| 浏览器不支持 Media Session | 跳过元数据和动作注册，播放器本身不受影响 |
| 页面切到后台 / 锁屏 | 音频时钟可能卡住；回页时检测并切回暂停，下次播放换新 `AudioContext` |
| 空难度（编辑器） | 用 `EMPTY_CHART`，能听音乐、看背景、看波形；不显示错误 |
| 文本编译失败（编辑器） | 保留上一版画面，错误通过 `onTextError` 显示；绝不整屏清空 |
| 没有谱面/封面 | `ChartPreview` 只显示封面图，不挂播放器 |

## 9. 已知限制与注意

1. **自动播放限制**：第一次出声必须在用户手势里（`AudioContext.resume()`、静音 `<audio>.play()`）。后台预加载只负责下载/解码，不等于已播放。
2. **PV 编码**：`<video>` 能放什么由浏览器决定；坏文件或不支持的编码会走“重挂一次 → 隐藏”。
3. **iOS 全屏**：iPhone Safari 只允许视频全屏，播放器全屏按钮不显示；系统媒体控件是主要的手势/锁屏入口。
4. **时长**：音频加载前用谱面估算时长，加载后以音频和谱面中较长者为准；两者切换时进度条总长会跳一下。
5. **逐难度 `&first_N`**：预览编译会优先用 `first_{N}`；编辑器的单元格时间轴目前只传全局 `&first`（见 [edit.md](edit.md) §11）。
6. **`showAnalyzer`**：代码保留，但当前没有页面打开谱面密度柱。
7. **性能诊断**：`?perf=1` 会持续采集 4 秒窗口的帧率/渲染/长任务数据，正式环境默认关闭；排查完记得关掉。
8. **`src/majview` 的边界**：不要在这个目录里 import 接口或路由；页面级预取、i18n、埋点都应该留在 `components/song` 或页面层。

## 10. 测试与验收

| 范围 | 测试 |
|---|---|
| 谱面解析 / golden | `test/majview/simai.parity.test.ts`、`simai.compile.test.ts`、`scripts/gen-simai-golden.mjs` |
| 音效时间表 / 时钟 | `test/majview/timeline.test.ts` |
| 时间轴绘制 | `test/majview/visualizer.test.ts` |
| 设置 / 迁移 | `test/majview/settings.test.ts` |
| 手势参数 | `test/majview/gestures.test.ts` |
| 频谱 / 密度 | `test/majview/spectrum.test.ts`、`analyzer.test.ts` |
| 几何 | `test/majview/geometry.test.ts` |
| 编辑器与播放器的交互 | `e2e/editor-audio-first.spec.ts`（First 改后打击音跟随、不中断播放） |
| 手工验收 | 桌面 1440px + 手机 390px：播放/暂停、切页签、评论时间/combo 跳转、全屏、设置迁移；编辑器时间轴另见 [edit.md](edit.md) §6.5 |

改播放器时至少跑：

```bash
pnpm lint
pnpm test
pnpm build
```

涉及编辑器联动时再加 `pnpm test:e2e`。
