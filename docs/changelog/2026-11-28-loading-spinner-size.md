# 修掉偶发的超大加载转圈

日期：2026-11-28
分支：`main`

## 背景

`LoadingSpinner` 的宽高是内联样式（`style={{ width, height }}`），默认 `size = 48`。
几个调用方按 Tailwind 的写法传了 `className="w-4 h-4"`，以为能缩到 16px，但内联样式优先级
更高，实际仍然是 **48px**。结果在这些地方转圈会突然变得很大：

- 上传弹窗里「正在查询这个谱面是否已存在…」那一行；
- 上传按钮的 loading 状态（按钮本身才 44px 高）；
- 确认弹窗的「确定」按钮（按钮 40px 高，转圈 48px）。

搜索页、列表里走 `SectionLoading` 的地方尺寸一直是 32px，看起来正常，所以问题显得「有时候」才出现。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/components/ui/LoadingSpinner.tsx` | 补清楚 props 注释：`className` 只用于颜色/动画，尺寸必须用 `size`（内联宽高会盖过 `w-`/`h-`） |
| `src/components/user/ChartUploader.tsx` | 哈希检查行、上传按钮里的转圈改为 `size={16}` |
| `src/components/ui/ConfirmDialog.tsx` | 确认按钮里的转圈改为 `size={16}` |
| `src/pages/QRAuthPage.tsx` | 去掉无效的 `className="w-4 h-4"`，只留 `size={16}` |

现在仓库里所有 `<LoadingSpinner>` 都用 `size` 指定尺寸，没有再用 `w-`/`h-` 工具类控制。

## 验证

- 全仓库检索 `<LoadingSpinner … className="… w-/h-">` 已无匹配。
- `pnpm test`（61 个文件、490 个用例）、`pnpm lint`、`tsc -p tsconfig.app.json --noEmit`、
  `pnpm build` 通过。
- 上传弹窗需要登录才能打开，本次没有在浏览器里截图核对；按代码，三处转圈从 48px 变为 16px，
  其余位置尺寸不变。

## 注意

- `LoadingSpinner` 的接口没有改，仍可用字符串尺寸（如 `"18px"`）；只是不要再通过 className 改宽高。
- 默认尺寸仍是 48px，只有明确需要 48px 的地方（目前没有直接使用默认值的调用方）才会用到。
