# 编辑器里「打开文件夹」失败时没有任何反馈

日期：2026-11-26
分支：`main`

## 背景

`useChartFolder` 的 `pickDirectory()` 把 `showDirectoryPicker()` 的所有异常都吞成 `null`：

```ts
try { return { name: handle.name, handle }; } catch { return null; }   // 旧实现
```

于是「用户自己取消」和「浏览器拒绝/异常」完全分不开，而调用方只把 `null` 当成取消：

- 权限被拒（`NotAllowedError`）、被策略禁用（`SecurityError`）、已经有一个选择器开着
  （`InvalidStateError`）、句柄过期……都会表现成**点了「打开文件夹」、选完文件夹之后什么都没发生**；
- 空状态里的错误提示只挂在 `!folder` 分支上，已经开着谱面时再打开失败，错误完全看不见。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/hooks/useChartFolder.ts` | `pickDirectory()` 只把 `AbortError`（Esc / 关闭按钮）当作取消，其他异常往上抛；`open()` 的 catch 用 `console.error` 留痕，并把原因包进 `editor/useChartFolder.OpenFailed` 文案显示 |
| `src/pages/EditorPage.tsx` | 已经打开谱面时，打开失败的错误显示为判定盘上方的浮层（`.editor-error-overlay`），不再是静默失败 |
| `src/styles/components/editor.css` | 新增 `.editor-error-overlay`（绝对定位在 stage 顶部，`pointer-events: none`，不挡预览） |
| `src/locales/{zh,en,ja,ko}.json` | 新增 `editor/useChartFolder.OpenFailed`（带 `{{message}}`） |

## 验证

- 新增 `e2e/editor-open-failure.spec.ts`（3 个用例）：
  - 选择器抛 `NotAllowedError` → 空状态里出现「打开文件夹失败 + 原因」，按钮回到可点状态；
  - 抛 `AbortError`（用户取消）→ 没有任何提示，仍停在空状态；
  - 已经打开谱面时再打开失败 → 浮层提示出现，当前谱面和 First 值都还在。
- 浏览器手测（dev）：用桩分别模拟 `NotAllowedError` / `SecurityError` / `AbortError` / 正常打开，
  行为与上面一致；控制台会打印 `[editor] open folder failed <name>: <message>`。
- `pnpm lint`、`tsc -b`、`pnpm i18n:check`、`pnpm test`、`pnpm test:e2e` 通过。

## 注意

- 判断「取消」只认 `DOMException` 且 `name === 'AbortError'`；Chrome 点右上角关闭和按 Esc 都是这个。
- 已经打开谱面时的错误浮层没有关闭按钮：下一次「打开文件夹」开始时 `setError(null)` 会清掉它。
  需要手动关的话再加按钮，现在保持和空状态一致（错误只在下一次操作时消失）。
- 错误浮层的 `pointer-events: none`，不会挡住判定盘的手势和预览。
