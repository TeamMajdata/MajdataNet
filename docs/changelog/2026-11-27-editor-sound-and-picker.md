# 新建空谱面没有打击音；目录选择器偶尔不弹出

日期：2026-11-27
分支：`main`

## 背景

两件事都是线上/本地偶发、但能定位到具体代码的：

**1. 新建空谱面后，敲进去的 note 没有声音**

`Transport.load` 只下载「当前谱面用到的音效样本」：

```js
const names = new Set(soundEvents(chart).map((e) => e.name));
```

新建的空谱面没有 note，`soundEvents` 是空数组 → 一个样本都不下载。之后用户敲出第一个
`1`，热替换会重排时间表，但 `this.samples` 里没有 `answer` / `judge` 这些键，`voice()`
直接 return —— 画面有音符、完全没有声音，只有重新打开谱面才恢复。

**2. Chrome 偶尔不弹「选择文件夹」窗口**

`showDirectoryPicker()` 要求**用户手势**，且浏览器只在短时间窗口内认这个手势。代码里有两条
路径会把手势耗掉或让对话框卡住：

- 「保存 → 打开文件夹」：确认框的「保存」分支先 `await save()`（写文件、可能弹权限），
  再调选择器；等待期间手势过期，Chrome 直接拒绝，而旧代码把异常吞成 `null`，表现就是
  **点了没反应**；
- 「新建」时选到没有 track 的文件夹：旧代码 `window.alert()` 之后**自动再弹一次**选择器；
  alert 之后手势已经失效，第二次调用被拒 → 同样是没反应；
- 另外，选择器对话框如果被其它窗口挡住，Promise 会一直 pending，界面永远停在「打开中…」，
  按钮还是禁用的，只能刷新页面。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/majview/audio.js` | `Transport.load` 改为加载**全部**音效样本（`Object.keys(channels)`，10 个），空难度 / 新建谱面里后来敲进来的 note 也有声音 |
| `src/hooks/useChartFolder.ts` | 新增 `chooseFolder()`：在用户手势里先弹选择器；「保存后打开」改成**先选目录、再保存、再用已选目录**，不再让保存耗掉手势 |
| `src/hooks/useChartFolder.ts` | 「新建」时没有 track / 已有 maidata.txt 只提示，不再 alert 后自动重弹选择器（用户重点一次即重新拿到手势） |
| `src/hooks/useChartFolder.ts` | 选择器 8 秒没结果时置 `pickerSlow`，页面提示「可能被其他窗口挡住了」；新增 `cancelPicker()` 让用户放弃等待、恢复按钮（`abandonRef` 保证晚到的 handle 被忽略） |
| `src/pages/EditorPage.tsx` | 空状态 / 判定盘上显示 `PickerSlow` 提示 + 「取消」按钮；确认框的「保存」分支改为 `chooseFolder() → save() → action(dir)` |
| `src/locales/{zh,en,ja,ko}.json` | 新增 `editor/useChartFolder.NeedGesture`、`editor/EditorPage.PickerSlow` |

## 验证

- 浏览器（空谱面 fixture，`track.mp3` + 空 `&inote_*`）：播放后
  `__majviewDebug.transport.samples` 出现全部 10 个键
  （`answer break clock hanabi judge judge_break judge_ex slide touch touchHold_riser`），
  修前这里是空的。
- 选择器：桩掉 `showDirectoryPicker` 抛 `NotAllowedError` → 空状态显示「打开文件夹失败 + 原因」；
  抛 `AbortError` → 安静取消；正常返回 → 正常装入（日志见下）。
- `pnpm lint`、`tsc -b`、`pnpm i18n:check` 通过。

## 注意

- 全部样本约 550 KB（`touchHold_riser.mp3` 占一半），一次性加载换来「编辑器里任何改动都有声音」；
  `song` 页本来也大多会用到其中大部分。
- 选择器的手势窗口是浏览器的硬限制，代码只能保证「调用发生在点击的那一刻」；如果 Chrome 仍然
  拒绝，现在能看到具体原因，而不是静默失败。
- 对话框被挡在其它窗口后面属于系统/浏览器行为，我们无法把它前置；提示 + 取消是能做到的上限。
