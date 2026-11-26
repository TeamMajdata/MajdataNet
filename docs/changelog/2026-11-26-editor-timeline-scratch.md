# 拖动时间轴时能听到音乐（DJ 搓碟）

日期：2026-11-26
分支：`main`

## 背景

拖动波形时间轴时 `Transport.pause()` 会先把播放停掉，拖动过程完全静音：只能看光标和波形，
听不到自己拖到了哪里。做谱时对拍很依赖耳朵，所以希望像 DJ 搓碟一样，拖动时能听到那个位置的声音。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/majview/audio.js` | 新增 `Transport.scratch(time, rate)` / `Transport.stopScratch()`：从 `time` 开始播一小段（`SCRATCH_SEC = 0.12s`）音乐，走 `BGM` 增益节点（音量设置照样生效），5ms 淡入淡出避免爆音；每次拖动先掐掉上一段 |
| `src/majview/audio.js` | 播放速率跟手速走：`rate` 由调用方按「每毫秒拖过多少秒」算出来，`scratch` 里夹到 0.5–2.5；`start()` / `dispose()` 会收掉搓碟声 |
| `src/components/song/MajView.tsx` | 时间轴 `pointerdown` 里 `context.resume()`（借用户的这次按下恢复 AudioContext），`pointermove` 里按手速调 `scratch()`，`pointerup` / `pointercancel` 里 `stopScratch()` |

## 行为

- 按下时间轴：暂停正常播放，同时把 AudioContext 恢复（Chrome 只允许在用户手势里 resume）。
- 拖动中：每移动一次就从对应位置播 0.12s 的片段，**位置变了声音就跟着变**；拖得快音调高、
  拖得慢音调低（播放速率 0.5–2.5，超出这个范围就夹住）。
- 松开：淡出收掉片段，停在拖到的位置；再按播放从那里继续。
- 拖到音频之外（谱面比音频长时允许）：没有声音，但不报错、也不影响画面。

## 验证

- 浏览器手测（`E:\FL\star impression\谱`，`?perf=1`）：按空格播放后拖时间轴，拖动期间
  `__majviewDebug.transport.scratchVoice` 每帧都在，`playbackRate` 在 1.7–2.5 之间随拖动速度变化，
  `context.state === 'running'`；松手后 `scratchVoice` 变 null，光标停在拖到的位置。
- `pnpm lint`、`tsc -b` 通过。

## 注意

- 片段只有 0.12 秒：连续拖动时上一段会被下一段截断（5ms 淡出），听感上是连续的"搓"而不是断续的"咔"。
- 走 BGM 声道，所以设置里的音乐音量/静音对它同样有效；打击音不受影响（拖动时本来就暂停）。
- 速率夹在 0.5–2.5：拖得极快时不至于变成鸟叫，也不至于慢到听不出内容。
