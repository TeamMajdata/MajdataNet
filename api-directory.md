# MajdataNet API 对齐记录

本次前端以 `mmfcapi` 的 `origin/dev`（`aa8b3083e3d21feac125c861d644663947426d9a`）为准。
后端当前本地检出的 `accounts` 仍是旧协议；核对使用的是 `origin/dev` 中的源码，未更改后端工作区。
前端分支：`refactor/backend`。浏览器请求保留 `/api3` 代理前缀，以下路径为其后的后端路径。

## 认证

| 操作 | 方法及路径 | 请求 | 返回及页面行为 |
| --- | --- | --- | --- |
| 注册验证码 | POST `/api/challenge/email` | FormData：`email` | 返回字符串 `challengeKey`，邮件发送 8 位数字验证码，有效期 5 分钟 |
| 注册 | POST `/api/account/register` | FormData：`username`、`nickname`、`email`、`password`、`challengeKey`、`challengeCode`、`cf-turnstile-response` | 返回用户资料；账号已激活，页面转到登录 |
| 登录 | POST `/api/account/Login` | FormData：`username`（也可填邮箱）、`password`、`rememberMe` | 设置会话 Cookie，刷新当前用户资料，保留站内回跳路径 |
| 请求重置密码 | POST `/api/account/password-reset/request?email=...` | 邮箱在查询参数中，无请求体 | 返回字符串 `challengeKey`；未知邮箱也返回字符串，前端统一提示 |
| 确认重置密码 | POST `/api/account/password-reset/confirm` | FormData：`email`、`newPassword`、`challengeKey`、`challengeCode` | 可返回空响应；旧会话全部失效，页面转到登录 |
| 登出 | POST `/api/account/logout` | 会话 Cookie | 当前会话失效 |

密码继续按现有协议发送 MD5。用户名最多 24 位，仅支持 ASCII 字母、数字、下划线与连字符。
更换邮箱后清除 challenge；页面处理超时、重发等待、限流和网络错误。
注册接口在检查验证码之后才校验人机验证、账号唯一性等条件，因此提交失败后要求重新获取验证码。
废弃的 `/account/verify`、`/account/forget` 不再被调用。旧 `?otp=` 链接显示迁移提示。

## 用户资料

- GET `/api/account/profile`：当前用户资料；GET `/api/account/profile?username=...`：公开资料。
- 字段：`id`、`username`、`nickname`、`email`、`introduction`、`avatarId`、`joinDate`。其他用户的 `email` 为 null。
- POST `/api/account/profile`：FormData，可提交 `nickname`、`introduction`、`avatar`，返回更新后的资料。
- GET `/api/avatar/{avatarId}`：头像。有资料对象时直接使用此路径；只有用户名时保留后端仍支持的 `/api/account/icon?username=...` 重定向。
- 头像和简介上传后刷新资料，避免旧头像缓存；昵称用于显示，用户名继续用于链接、归属判断和 API 查询。
- GET `/api/account/recent?username=...`、GET `/api/account/scores` 的已有调用协议保持兼容。

## 排行、收藏与评论

| 功能 | 对齐结果 |
| --- | --- |
| 全站总分榜 | 改用 GET `/api/maiscore/sum/all?page=0&pageSize=...` |
| 上传者榜、MMFC 榜 | 继续使用已实现的 GET `/api/stats/score-sums?uploader=...&page=...&pageSize=...`；新 `/maiscore/sum/chart/by-uploader/...` 仍为空实现，不切换 |
| 总分返回值 | 从旧数组和 `dxAccSum` 改为 `{ geneTime, players: [{ userId, username, acc: { dx, classic } }] }` |
| 收藏歌单列表 | GET `/api/account/favorite/collection/list` 返回 `songHashs`，卡片的 `count` 从数组长度计算 |
| 删除评论 | DELETE `/api/maichart/{chartId}/interact` 的 FormData 使用 `type=comment`、`comment-id`，替换旧的 `commentId` |
| 单曲排行榜 | `player` 的昵称、头像信息用于显示，用户名用于个人空间链接 |

已核对仍兼容的接口：谱面搜索/排序/详情及文件下载、上传及哈希检查、删除、标签更新、点赞/取消点赞、评论/回复请求、歌单创建/修改/删除/曲目增删、收藏/取消收藏、季赛榜请求和最近游玩数据、机台扫码授权。

## 需要后端修复的阻碍

以下是目标提交本身的问题，前端未通过修改查询含义、吞掉失败或重复写入来绕过：

1. `src/WebApplication2/Controllers/StatisticsController.cs:34`：`page` 限制为至少 1，但默认值为 0，且服务按 `Skip(page * pageSize)` 做零起点分页。`page=0` 会被校验拒绝，改成 1 会漏掉第一页。影响上传者榜和 MMFC 榜；应允许 `page >= 0`。全站榜已改用允许 0 的新接口。
2. `src/WebApplication2/Controllers/MaiChartApi/InteractController.cs:175`：评论/回复分支声明 `newInteract` 后没有接收 `AddCommentAsync` / `ReplyCommentAsync` 的返回值，写入后仍检查 null 并返回 400。应接收返回值并据此判断结果，否则用户可能因错误提示重复提交。
3. `src/WebApplication2/Controllers/AccountApi/AccountController.cs:218`：旧的待激活账号登录仍发送激活链接，但 `GET /account/verify` 已移除。前端提示旧账号联系管理员；需要后端提供旧账户迁移或新的激活流程。
4. `src/WebApplication2/Controllers/CollectionController.cs:209`：空字符串描述被 `SetIf(!string.IsNullOrEmpty(...))` 忽略，现有歌单不能清空描述。需要将“未传字段”与“传入空字符串”区分。资料简介也有相同限制，前端继续禁止空简介提交。

## 验证

- `pnpm build`：类型检查和生产构建。
- `pnpm i18n:check`：中文、英文、日文、韩文键值一致性。
- `NODE_OPTIONS=--no-experimental-webstorage pnpm test`：当前机器使用 Node 26，需要关闭 Node 自带的 Web Storage，避免与 jsdom 的 localStorage 冲突。
- 本次共 88 项测试通过；修改的 TypeScript/React 文件 lint 通过。全仓 `pnpm lint` 仍有未修改文件中的 17 个既有错误（静态 Workbox 文件的规则引用、旧类型中的 any、既有 Fast Refresh 导出限制）。
- 新增测试覆盖验证码注册/重置、字段与请求方法、验证码过期和重发、邮箱变更、错误响应、头像/简介/昵称提交、排行榜结构和收藏计数。
- 浏览器检查使用隔离会话和模拟 API；没有向线上发送注册、邮件、改密或资料更新请求。真实 SMTP、Cloudflare 和后端数据库联调仍需部署环境验证。
