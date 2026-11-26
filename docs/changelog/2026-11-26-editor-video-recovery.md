# 把时间轴拖到音频末尾之后，PV 消失不恢复

日期：2026-11-26
分支：`main`

## 背景

编辑器的时间轴拖动上限是 `duration = max(音频时长, 谱面结束时间)`。谱面比音频长时（有留白、
或 `&first` 把整张谱面往后推），时间轴可以拖到**音频和视频都结束之后**的位置。

这时 `syncVideo` 会把视频 seek 到 `min(time, video.duration)`，也就是**正好等于** `video.duration`。
Chrome 对"seek 到 duration"的处理会把元素置成 ended，之后偶发 `error`（实测
`MEDIA_ERR_NETWORK`），而 `onError` 直接把 `videoVisible` 设成 false —— **元素从此再也不会重新
加载**，拖回有音频的位置也不会恢复，只能刷新页面。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/components/song/MajView.tsx` | `syncVideo`：出过错的视频不再碰；目标时间夹到 `video.duration - 0.06`，不 seek 到正好 duration；越界时暂停而不是继续播 |
| `src/components/song/MajView.tsx` | `<video>` 加 `key={videoAttempt}`，`onError` 时先重挂一次元素（重新挂 src → `onLoadedData` → 重新显示），再失败才隐藏 |

## 语义

- **PV 的进度只跟媒体时间（音频）走**，和谱面 `&first`、`First 偏移` 都没有关系：`syncVideo` 用的
  是 `transport.time`（媒体时钟），`&first` 只平移音符（`compileChart` 里加到 note time 上）。
- 谱面比音频长时，时间轴可以拖到音频之外：画面停住、PV 停在最后一帧附近，但**不会损坏视频元素**，
  拖回来 / 重新播放就能继续。

## 验证

- 浏览器手测（真实谱面 `E:\FL\star impression\谱`，PV 138.8s）：把时间轴拖到最左（超过音频末尾），
  修前 `<video class>` 变空、`error.code` 变成 2、拖回来也不恢复；修后保持 `visible`、无 error、
  停在 138.68s，拖回 / 播放后继续走。
- `pnpm lint`、`tsc -b` 通过。

## 注意

- `-0.06` 秒的余量是为了避开"seek 到 duration"这个边界，肉眼看不出来（停在最后一帧前一点点）。
- 重挂只有一次机会：真的是坏文件 / 不支持的编码时，第二次失败就退回默认底图，不再反复重建。
- 时间轴仍按 `max(音频, 谱面)` 取长度：谱面比音频长的时候允许拖到没有声音的地方，这是编辑器的需要。
