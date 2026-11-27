# 个人空间「上传的谱面」加排序

日期：2026-11-28
分支：`main`

## 背景

个人空间的「上传的谱面」页签只有页内搜索，没有排序：列表固定在接口默认的「最近活跃」，
搜出结果后也只能按这个顺序看。搜索页和歌单页早就有一排排序选项（活跃 / 热门 / 分数 /
评论 / 播放 / 上传时间），这里缺一组。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/components/user/UploadedCharts.tsx` | 搜索框右边加 `SortMenu`，和搜索页共用 `SORT_WORDS`、`useSortOptions`、`parseIndexParam`；排序下标写进网址 `?sort=`（默认 0 不落参数）。第一屏 `SongList` 的两个接口页和搜索模式的全量拉取都带上排序词 |
| `test/components/user/UploadedCharts.test.tsx` | 新增组件测试：选中「上传时间」后列表接口变成 `sort=timep`，网址变成 `sort=5` |

排序参数和搜索词、页签一起放在地址栏里，刷新/分享/浏览器回退都能还原。搜索模式下
`collectAllPages` 本来就按接口顺序合并，带排序拉回来后前端过滤不会打乱顺序，所以过滤结果
也是全局排序后的顺序。

## 验证

- 开发服务器（`pnpm dev`，http://localhost:3000）真实数据，LSP2 的空间：
  - 默认「活跃」：`/space?id=LSP2&tab=uploaded`，列表首项 `Doki Doki Forever`；
  - 切「上传时间」：网址变为 `...&sort=5`，Network 里两页列表请求都带 `sort=timep`，
    首项变成最新上传的 `一冊のアロー`；切回「活跃」参数消失、顺序恢复；
  - 搜索 + 排序：`?q=Doki&sort=5` 下仍显示「找到 1 张谱面 / Doki Doki Forever」，
    全量拉取的第 0–5 页也都带 `sort=timep`；
  - 390×844 手机视口：搜索框和排序按钮同一行，排序按钮不挤压输入框。
- `test/components/user/UploadedCharts.test.tsx` 通过；`pnpm test` 共 61 个文件、
  490 个用例全部通过；`pnpm lint`、`pnpm i18n:check`、`pnpm build` 通过。

## 注意

- 默认排序保持接口原来的「最近活跃」，没有把「上传时间」设成默认，行为和搜索页一致。
- 搜索模式改变排序会重新拉一遍这个用户的全部上传（按新排序分页），期间显示加载态；
  用户上传很多时这一步会比第一屏慢，和原来首次聚焦搜索框的代价一样。
- 排序菜单只复用现有文案，没有新增 i18n key。
