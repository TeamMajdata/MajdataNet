# 编辑器的 First 输入框不跟随打开的谱面，清空还会写成 0

日期：2026-11-26
分支：`main`

## 背景

输入框是 `defaultValue={getFirst(maidata)}` + `key={folder.name}-${active}` 的不受控写法。
打开谱面时 `folder` 先更新、`maidata` 在 effect 里随后才写入，输入框在中间那次渲染就挂了载，
`defaultValue` 拿到的是上一张谱面的值（新打开时是 0）。之后 `maidata` 更新也不会重新挂载，
所以打开任意谱面 First 都显示 0。

顺带还有两个坑：

- 输入框是 `type="number"`，清空时 `Number('') === 0` 且 `Number.isFinite(0)` 为真，会立刻把
  `&first` 写成 0 —— 用户清一下再输就成了「First 突然归零」；
- 打开 `&first=4.11` 的谱面时框里显示 0，用户把它改成 4.11，`setFirst` 写回的内容和文件里完全
  一样（字符串相等 → React 直接 bail out），看起来就是「改了 First 预览没反应」。其实预览早就
  按 4.11 在跑，是输入框在说假话。改完这个输入框后，写回 `&first` 到预览的热替换链路本身是好的
  （`MajView` 的 `chartText` 变化会重编译，音符时间整体平移）。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/pages/EditorPage.tsx` | First 输入框改为受控：`firstDraft ?? getFirst(maidata)`；换谱面 / 切难度时清空草稿；输入为空或非法时不写回，失焦回到文件里的真值 |

## 验证

- 新增 `e2e/editor-first.spec.ts`：用 `showDirectoryPicker` 的桩喂谱面，断言打开后 First 显示
  `4.11`、改成 10 后出现「未保存」、逐字输入小数（`4.` 的中间态不被吞）、清空失焦后回到 10
  （不是 0）、再打开另一份谱面时变成 `1.5`。
- 浏览器手测：用 `E:\FL\star impression\谱`（`&first=4.11`）打开，First 显示 4.11，改成 10 后
  预览里第一个音符从 4.11s 挪到 10s（`__majviewDebug.chart.notes[0].time`）。
- `pnpm lint`、`tsc -b`、`pnpm test`、`pnpm i18n:check`、`pnpm test:e2e` 全部通过。

## 注意

- 输入框用 `type="number"`：输入 `4.` 时 DOM 的 `value` 是空串，所以 onChange 里的空值判断是
  「不写回」而不是「写 0」；草稿保存的是输入框自己的原始文本，React 不会把中间态吞掉。
- `&first_N`（逐难度偏移）仍然只读不写：编辑器里只有全局 `&first` 一个入口（spec 决策 2）。
  如果某张谱面自带 `&first_N`，预览用的是 `first_N`，此时中栏显示的是全局值 —— 这是既有设计，
  本次没有改。
