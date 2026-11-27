# 编辑器禁用输入法；谱面编辑框加右键菜单（`=` 也能开）

日期：2026-11-27
分支：`main`

## 背景

- 谱面文本是 ASCII 的 simai：输入法（中文/日文）一开，组词会吞掉按键，最后把整串候选词
  插进谱面，很容易把文本弄坏；
- 镜像变换和撤销/重做以前只有「编辑」菜单和 Ctrl+Z，编辑时右手在鼠标上，来回够菜单很烦。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/components/editor/SimaiCodeEditor.tsx` | 监听 `compositionstart`：`stopPropagation` 后让编辑区失焦再聚焦（Chrome 在失焦时会取消这次组词），并用 `beforeinput` 兜一层（`*Composition*` 的输入一律 `preventDefault`）；详细日志里记「拦下输入法组词」 |
| `src/components/editor/SimaiCodeEditor.tsx` | `contextmenu: false` 关掉 Monaco 自带右键菜单；`editor.addCommand(monaco.KeyCode.Equal, …)` 把 `=` 交给页面（不插入字符）；`.editor-code` 上挂 `onContextMenu` 上报屏幕坐标 |
| `src/components/editor/EditorContextMenu.tsx` | 新增右键菜单：镜像变换 5 项在前，撤销 / 重做在后；打开后自己拿焦点，`↑` / `↓` 移动（跳过不可用项）、`Enter` / `空格` 执行、`Esc` 收起；鼠标悬停同步高亮；位置夹在视口内 |
| `src/pages/EditorPage.tsx` | 菜单状态与动作接线：`=` 时光标位置换算成屏幕坐标；弹菜单前重读一次选区（`hasSelection` 由 Monaco 事件推上来，偶尔晚一拍）；收起后把焦点还给编辑器 |
| `src/styles/components/editor.css` | `.editor-context-menu` 面板样式 + 当前项高亮 |
| `src/locales/{zh,en,ja,ko}.json` | 新增 `editor/EditorPage.Undo` / `Redo` |

## 行为

- 输入法开着时：按键不会变成候选词插进谱面；编辑器里只接受 ASCII 输入。
- 右键编辑区 → 菜单；或者把光标放到某处按 `=` → 同一个菜单弹在光标下方（不会插入 `=`）。
- 菜单打开时 `↑/↓` 在可用项之间移动，`Enter` 执行，`Esc` 收起并回到编辑器。
- 没有选区时镜像项是灰的（镜像是「只作用于选区」的既定行为）；撤销/重做始终可用。

## 验证

浏览器（真实谱面 + `?debug=1`）：

- 右键：菜单出现，顺序 `水平 / 垂直 / 180° / +45° / −45° / 撤销 / 重做`，Monaco 自带菜单不出现；
- `=`：菜单出现在光标下方，文本里的 `=` 没有被插入，`editor-save` 仍是「已保存」；
- `↑/↓`：高亮从「撤销」移到「重做」再移回；`Enter` 执行撤销，文本恢复、状态回到「已保存」，
  焦点回到编辑器；
- 选区：`Shift+→` 后打开菜单，镜像项由灰变亮；点第一项把 `1` 变成 `8`，状态变「未保存」；
- 输入法：派发 `compositionstart` 后 console 出现 `[MajdataEdit][editor] 拦下输入法组词`，
  焦点仍在编辑区，正常键入不受影响。

`pnpm lint`、`tsc -b`、`pnpm i18n:check` 通过。

## 注意

- 浏览器没有「关闭输入法」的标准 API：这里的做法是**取消每一次组词**（失焦 + 吞掉组词输入）。
  输入法仍然能被系统切出来，但组出来的字进不了谱面；要打中文注释请先切回英文输入。
- `=` 用 Monaco 的 keybinding 拦截，所以只在编辑区里生效；焦点在别的输入框时不出菜单。
- 右键菜单不会改选区，也不会移动光标。
