# 编辑器改了 First，打击音还按旧的偏移播放

日期：2026-11-26
分支：`main`

## 背景

编辑器的实时预览有两条链路：

- **画面**：`chartText` 一变就重编译、热替换 `Board`（音符位置、判定线时间都对）；
- **声音**：`Transport` 在加载音频时建一次音效时间表（`this.events = soundEvents(chart)`），
  之后热替换只更新了画面，没有更新这张表。

于是改 `&first`（滚轮或直接输入）后，音符按新偏移画，`answer` / `judge` / `clock` 等打击音
仍然按旧时间排出 —— 听感就是「画面变了，声音没变」。`Transport.setFirstOffset` 只处理设置面板
里的「First 偏移」，不处理谱面自带的 `&first`。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/majview/timeline.js` | 新增 `sameEvents(a, b)`：比较两份音效时间表（时间 / 名称 / 时长） |
| `src/majview/audio.js` | 新增 `Transport.setChart(chart)`：重算 `events`、`duration`、`begin`；时间表或范围真的变了才按当前位置重新起播（和 `setFirstOffset` 同一套做法），只是文本变了就什么都不做，避免每次按键掐断音乐 |
| `src/components/song/MajView.tsx` | 热替换编译结果时调用 `transport.setChart(compiled)`，并用 `transport.duration` 更新总长 |

## 验证

- 新增 `test/majview/timeline.test.ts` 的三个 `sameEvents` 用例：同表判等、`&first` 平移判不等、
  事件列表不同判不等。
- 新增 `e2e/editor-audio-first.spec.ts`：用桩喂一份 `&first=4.11` 的谱面和音乐，`?perf=1` 打开
  `__majviewDebug`，点播放后读 `transport.events` 里的 `answer` 时间（首个应为 4.11），把 First
  改成 6.11 后整组时间 +2 秒，且 `transport.playing` 仍为 true、播放位置没有跳回开头。
- 浏览器手测：`E:\FL\star impression\谱`（`&first=4.11`）播放中把 First 改到 10，画面与打击音
  一起后移 5.89s，音乐本身不跳。
- `pnpm lint`、`tsc -b`、`pnpm test`、`pnpm i18n:check`、`pnpm test:e2e` 通过。

## 注意

- 重新排音的做法是 `pause()` + `start()`：已排进音频线程的旧音效会被清掉，音乐只断几毫秒。
  只有在 `events` / `begin` / `duration` 真的变化时才会发生（改注释、改无关字段不会触发）。
- `Transport.load` 只下载谱面实际用到的音效样本。热替换时如果新谱面第一次出现某种 note
  （例如原来没有 touch），对应的样本没加载，那一下不会响，要重新打开才正常。这是既有行为，
  本次没有改。
- `&first` 只影响谱面与打击音，音乐本身不动 —— 这正是 First 的语义（对齐音画用）。
