# 互动系统改为 Reddit 式投票与评论

日期：2026-10-31
分支：`feat/reddit-interactions`（基于 `dev`）
提交：`0b01178` 互动系统改为 Reddit 式投票与评论；`2ffacb4` dev 代理支持 `VITE_API_PROXY` 指向本地后端
配套后端：mmfcapi `feat/reddit-interactions`，接口与迁移说明见该仓库的 `docs/changelog/2026-10-31-reddit-interactions.md` 和 `docs/API.md`

## 概要

点赞、点踩和原来的评论区换成与 OurTaiko Fanmade 一致的 Reddit 式交互：上下箭头投票、线程式评论、多种排序、永久链接。网页全部改用新的 JSON 接口；`/api/maichart/{chartId}/interact` 的表单接口只留给游戏客户端，网页不再调用。

术语：点赞 = 投赞（+1），点踩 = 投踩（−1），再点一次已选中的箭头即撤票（0）。

## 改动

**投票**

- 新组件 `src/components/song/VoteControl.tsx`：上下箭头加分数，乐观更新，服务端拒绝时回滚并提示；未登录时跳到 `/login?redirect=当前页`。
- 歌曲页侧栏的点赞墙换成 `ChartVotePanel`（分数、赞数、踩数、播放数）。
- 成绩卡片的旧点赞按钮换成紧凑的 `ChartVoteBadge`。

**评论区**（`src/components/song/SongComments.tsx`，`CommentSection`）

- 线程树：头像列的竖线可点击折叠，显示作者、相对时间、「已编辑」，上传者的评论带标记。
- 排序：最佳、最高分、最新、最早、争议。
- 每页 20 条顶层评论，「加载更多」并去重；第 8 层以下改为「继续阅读这个话题」链接。
- 分数不高于 −5 的评论默认折叠。
- 回复、编辑、删除（行内确认）、分享链接；管理员可移除他人评论。
- 已删除或被移除的评论显示为占位符，保留其下的回复。
- 正文改为纯文本：自动识别网址和 `@用户名`，不再渲染 Markdown，也不解析 HTML。
- 永久链接 `/song?id=谱面&comment=评论`：只显示这条评论及其回复，并滚动到它；提供「查看全部评论」「查看上一级」。
- 管理员判定：`useIsAdministrator` 用 `GET /api/admin/groups` 是否返回 200 判断。

**列表与页面**

- 列表计数改为一页一次 `POST /api/maichart/interactsum` 批量读取（`InteractSummaryProvider` + `useInteractSummary`），卡片显示播放、分数、评论数，不再每张卡单独请求。
- 首页排序改为：活跃（默认）、热门（`hotp`）、分数（`topp`）、评论、播放、上传时间。URL 里的 `sort` 序号随之变化。
- 排行榜「点赞」榜改为「评价」榜，按分数排序。
- 个人空间新增「发表的评论」分页列表。

**其它**

- 类型集中在 `src/types/interact.ts`；删除旧的 `src/types/comment.ts` 及相关 props 类型。
- 新增 `jsonRequest` 请求工具和 `compactNumber`、`intlLocale`、`loginPath` 工具函数。
- 四种语言的文案新增 `song/VoteControl`、`song/SongComments`、`song/SongInteraction`、`score/InteractCount` 等命名空间；删除不再使用的 `shared/ScoreCard` 和点赞相关文案。
- `vite.config.ts`：设置环境变量 `VITE_API_PROXY` 时，开发服务器把 `/api3` 去掉前缀代理到该地址，方便连本地后端；不设置时仍代理到线上。

## 测试

- `pnpm build`（含 `tsc -b`）、改动文件的 `eslint`、`pnpm i18n:check`（4 种语言，490 个 key）通过。
- `vitest` 185 个用例全部通过。新增 `VoteControl`、评论区（加载、排序、发表、删除、管理员移除、投票、永久链接、深度限制、未登录、失败重试）、评论树纯函数、批量计数、管理员探测的测试。
- 本地联调：本地 MongoDB 导入 2026-10-25 的线上备份，后端跑完迁移后，前端连本地后端检查了热门排序、评论线程和计数。
- 测试机：经 Cloudflare Tunnel 发布在 `https://majdatanet-test.leziblog.com/`，页面、排序、计数、评论分页，以及登录后的投票、发评论、编辑、删除均测试通过。

## 部署

前端必须和后端 `feat/reddit-interactions` 一起上线：新接口不存在时，投票、评论和列表计数都会报错。

测试机上的发布方式：

```bash
bash ~/deploy/deploy-frontend.sh feat/reddit-interactions
```

脚本拉取指定分支，执行 `pnpm install --frozen-lockfile` 和 `pnpm build`，再把 `dist/` 同步到 nginx 的静态目录。构建环境为 Node 22、pnpm 10，与 CI 一致。

## 已知限制

- 经 Cloudflare 上传谱面时，请求体上限为 100MB（免费套餐）。
- 首页 URL 中旧的排序序号（例如以前指向「点赞数」的 `sort=1`）现在对应「热门」，旧书签的排序会变。
- 本期没有通知中心；回复和 @ 提及仍由后端发邮件。
