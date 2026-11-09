# 歌单改用谱面 Id 列表与批量谱面信息

日期：2026-11-09
分支：`feat/collection-chart-ids`
提交：`343b73b` feat!: follow mmfcapi collection API changes
配套后端：mmfcapi `dev`（`09a2872`），见该仓库的 `docs/changelog/2026-11-09-collection-chart-ids.md`
接口对照：[api-directory.md](../../api-directory.md)

## 背景

后端移除了歌单增量接口 `POST /api/collection/{id}/diff`，把 `modify` 改为 `PUT`，并让 `songlist` 的 `items` 只返回谱面 Id（歌单顺序），谱面信息改由 `POST /api/maichart/info` 批量获取。

## 前端改动

| 位置 | 改动 |
| --- | --- |
| `src/hooks/useCollections.ts` | 谱面页加入/移出歌单：先读 `songlist` 的 `items`，本地增删后 `PUT modify` 提交完整列表，不再调用 diff |
| `src/pages/collection/CollectionPage.tsx` | 按 `items` 一次请求 `maichart/info`，按歌单顺序显示，空歌单不请求；管理模式保存改用 `PUT`，提交“原有（未移除）+ 新增”的 Id 列表 |
| `src/utils/chartInfo.ts` | 新增 `fetchChartInfos`：批量取谱面信息，按请求顺序返回，略过不存在的谱面 |
| `src/hooks/useSeasonCharts.ts` | 季赛歌单直接读取 Id 数组 |
| `src/components/collection/CollectionCard.tsx` | 封面使用 Id 数组 |
| `src/types/collection.ts` | `CollectionSongList.items` 改为 `string[]` |

## 验证

- 新增 `e2e/collection.spec.ts`（模拟后端）：批量请求谱面信息且保持歌单顺序；空歌单不请求；所有者保存时发送 `PUT modify` 与完整 `items`；全程不调用 diff。
- e2e 20/20、ESLint、`tsc -b`、Vitest 252/252 通过。未对真实后端联调。

## 部署

须与后端同时部署。
