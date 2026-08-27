# MajdataNet 项目 UI 设计文档

> 版本：v1.0（基于 `main` 分支代码审计整理）
> 适用范围：MajdataNet v2（`https://majdata.net`），maimai 饭制谱面分享平台前端
> 技术栈：React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · React Router 7 · Framer Motion · SWR · Axios · i18n

---

## 1. 产品定位

**MajdataNet** 是面向 maimai（舞萌 DX）玩家的饭制谱面分享与社区平台，核心功能：

- **谱面浏览**：全部谱面列表、随机推荐、搜索（标题/艺术家/上传者/标签）、排序（上传时间/点赞/评论/播放）
- **谱面详情**：封面、难度信息、WebGL 谱面预览（Majdata Unity 播放器）、下载（ZIP/ADX）、分享、收藏歌单
- **社区互动**：点赞、评论（Markdown + 回复楼）、上传者主页、最近游玩、个人成绩
- **排行榜**：谱面周榜（游玩/点赞/评论/下载）、用户总分榜、MMFC 打榜活动榜
- **活动**：活动展示（横幅 + 状态徽章 + 时间轴）、活动标签谱面聚合、原创曲专区
- **歌单（Collection）**：歌单广场、歌单详情、收藏歌单、hover 封面轮播
- **账号体系**：注册（邀请码 + Turnstile + 邮箱验证）、登录、找回密码、QR 机台授权
- **小游戏**：WebGL MiniGame（footer 入口）

用户群体：以中轻度玩家为主的社区型用户，偏好**信息密度高、图片驱动、辨识度强**的界面；同时面向谱师（上传/管理/打标签）与活动组织者。

---

## 2. 设计理念：v5「Quiet Flat（安静扁平）」

当前代码处于 **v5 重设计** 阶段（git 历史：`feat(ui): v5 redesign — flat clean style, fullscreen menu, mosaic cards, transparent navbar, latest events strip`），整体风格关键词：

- **扁平**：去除毛玻璃、重阴影、渐变等装饰；仅保留 1px 细边框与两级极轻阴影
- **大留白**：卡片间距 `gap-12`（3rem）、区块间距 `my-16`，靠留白而非分隔线切分内容
- **图片驱动**：主页以 8:3 直角大图马赛克网格为核心视觉，hover 叠加 `+` 反色符号
- **超大排版**：主页标题 `text-7xl`、全屏菜单 `4.2rem` 超大字重导航，强化品牌记忆
- **信息层级**：文字三档（ink / ink-2 / ink-3）+ 品牌色点缀，避免多色干扰

> 注：`index.css` 注释仍写 "v4 设计 Token"，与 v5 实际落地状态存在版本命名不一致（见 §13 遗留问题）。

---

## 3. 设计令牌（Design Tokens）

全部定义于 `src/index.css` 的 Tailwind v4 `@theme` 块，通过 `bg-surface / text-ink / border-line` 等工具类消费。

### 3.1 颜色

| Token | 值 | 用途 |
|---|---|---|
| `page` | `#f7f8fa` | 页面底色（浅灰） |
| `surface` | `#ffffff` | 卡片 / 面板 / 弹层 |
| `surface-2` | `#eef1f5` | 选中态、分区底、Tab 容器底 |
| `primary` | `#5c8dc1` | 品牌蓝：主按钮、激活态、链接、强调 |
| `primary-hover` | `#4a7daf` | 品牌蓝 hover |
| `primary-soft` | `#eef4fa` | 品牌色浅底（hover 底、通知面板） |
| `ink` | `#1f2937` | 主文字 |
| `ink-2` | `#6b7280` | 次级文字 |
| `ink-3` | `#9ca3af` | 弱化文字 / 占位 |
| `line` | `#e5e7eb` | 常规边框 / 分隔线 |
| `line-strong` | `#d1d5db` | 强调边框 |
| `ok` | `#10b981` | 成功 / 进行中状态 |
| `warn` | `#f59e0b` | 警示 / AP / 高亮互动数 |
| `danger` | `#ef4444` | 危险 / 删除 |

**语义色用法**：
- 状态徽章：即将开始 = `bg-primary text-white`；进行中 = `bg-ok text-white`；已结束 = `bg-surface-2 text-ink-3`（`HomePage` / `EventsPage`）
- 成绩 Combo：AP/AP+ = 琥珀（`warn`），FC/FC+ = 蓝（`primary`），普通 = 灰（`surface-2`）（`ScoreCard` / `ScoreRanking` / `ScoresPage` 筛芯片）
- 互动数 ≥5 高亮为 `warn`（`InteractCount`）

### 3.2 难度色（maimai 色相，不可更改）

| 索引 | 难度 | 色值 |
|---|---|---|
| 0 | Easy | `#4fa3ff` |
| 1 | Basic | `#3ed67b` |
| 2 | Advanced | `#ffd23f` |
| 3 | Expert | `#ff5252` |
| 4 | Master | `#7b1fa2` |
| 5 | ReMaster | `#d14ce6` |
| 6 | Utage | `#ff9e1b` |

展示形式：`24×24px` 方块、白字粗体 `0.75rem`、`border-white/30` 细描边、hover 缩放 1.08、空难度隐藏（`Level` / `Levels`）。

### 3.3 圆角

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | 6px | 小按钮 / 小徽章 |
| `--radius-md` | 8px | 输入框 / 普通按钮 |
| `--radius-lg` | 12px | 卡片 / 面板 / 弹窗 |
| `--radius-xl` | 16px | 大容器 |
| `rounded-full` | — | 胶囊：Tab、头像、圆形按钮、搜索框（歌单广场） |

### 3.4 阴影（仅两档）

| Token | 值 | 用途 |
|---|---|---|
| `shadow-card` | `0 1px 2px rgb(16 24 40 / 0.05)` | 卡片 / 弹层静态态 |
| `shadow-card-hover` | `0 8px 24px rgb(16 24 40 / 0.08)` | hover 抬升 / 弹窗 |

卡片 hover 统一：`hover:-translate-y-0.5 ~ hover:-translate-y-1` + `hover:shadow-card-hover`。

### 3.5 字体

```css
--font-sans: system-ui, -apple-system, "Segoe UI", "PingFang SC",
  "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
```

- 品牌字重：`font-black`（首页大标题、MAJDATA.NET 字标、全屏菜单导航）
- 标题层级：`text-2xl/3xl`（区块标题）→ `text-4xl~7xl`（页级大标题）
- 数字：成绩精度使用 `tabular-nums`（`ScoreRanking`）
- 代码/哈希：`font-mono text-xs`（歌曲详情 ID/HASH）

### 3.6 间距与栅格

- **栅格**：全站统一 `grid grid-cols-12`（12 列），列间距 `gap-x-6`、行间距 `gap-y-12`
- **内容容器**：全宽 `w-full px-4`（`--container-max-width: 100%`，无左右限宽），由页面内层自行约束（如 `max-w-5xl`、`max-w-2xl`）
- **区块留白**：`mb-16` / `mt-16` / `gap-12` 为惯用节奏
- **Header**：`--header-height: 56px`，body `padding-top: 4rem` 为 fixed 顶栏让位

### 3.7 动效令牌（Framer Motion 约定）

- 标准缓动：`ease: [0.25, 0.1, 0.25, 1]`（页面级进入、菜单）
- 内容上滑：`slideInUp` 变体（`opacity: 0, y: 30 → 1, 0`，`duration: 0.6`，`ease: [0.4, 0, 0.2, 1]`），以 `custom(delay)` 错峰
- 卡片入场：`whileInView` + `delay: (index % 5) * 0.05`，一次性
- 微交互：按钮 `whileHover={{ scale: 1.05~1.1 }}`、`whileTap` 缩放
- 弹窗/菜单：`AnimatePresence` + 透明度/位移 0.15~0.3s
- Tab 切换：`layoutId="activeTabIndicator"` 弹簧指示器（`ScoreRanking`）
- 尊重 `prefers-reduced-motion`（events 滚动条已处理）

---

## 4. 全局布局（App Shell）

### 4.1 顶栏（UnifiedHeader，`src/components/header/index.tsx`）

- `fixed top-0 z-1000`，**透明背景**（内容直接在其下滚动），高度 `h-16`（56px），左右 padding `px-5 md:px-10`
- 左侧品牌：`salt.webp` 圆角小图（hover 缩放）+ `MAJDATA<span>.NET</span>`（`font-black tracking-tight`，`.NET` 用 `ink-3` 弱化）
- 右侧（`gap-3 md:gap-5`）：
  - 未登录：`AuthSection` —— 文字链接 "Login / Register"（`ink-2 hover:primary`，hover 浅蓝底）
  - 已登录：`UserMenu` —— 头像（`w-9 h-9 rounded-full`，hover 放大、选中 `border-primary`），点击展开白底下拉（`Dropdown variant="user"`，`w-56`）：用户信息头 + 个人主页 / 个人成绩 / 谱面管理 / 我的歌单 / 账号设置 + 分隔线 + 退出（红色）
  - 菜单按钮：两横线汉堡（移动端无文字，`sm` 以上显示 "MENU"），点击打开全屏菜单
- 加载中：`LoadingSpinner` 脉冲占位

### 4.2 全屏菜单（FullScreenMenu）

- 覆盖全屏 `fixed inset-0 z-1200`，**白底深字超大排版**（与顶栏同风格）
- 顶部条：品牌 + 关闭（X + "CLOSE"）
- 中部导航：编号 `01–07`（`font-mono ink-3`）+ 超大字重标题 `text-[2.4rem] md:text-[4.2rem] font-black`，逐条错峰淡入上移（`delay: 0.08 + i*0.05`）；有子项的分组（Rankings/Tools）标题旁竖排子链接（当前路由 `text-primary font-semibold`）
- 底部条（`border-t border-line`）：用户头像 + 用户名 → 个人空间、退出按钮；或 Login/Register 链接；右侧 GitHub / Discord 外链
- 条目：Home / Rankings / Tools / Collections / Events / Original / Docs

### 4.3 页面布局（PageLayout）

```
<UnifiedHeader />
[可选页面大标题 section：motion 淡入 + h1 text-[2rem] font-bold]
<main class="w-full mt-4 px-4">…</main>
[可选 "Back to Home" 区块：border-t + 白底描边按钮]
[footer：bg-surface border-t；版权 + GitHub | Discord | QQ 链接 + 社区语 + bee.webp → /minigame]
<FloatingButtons />
<ToastContainer bottom-center light>
```

- 大标题为**居中**（继承全局 h1 规则），正文页面多自行覆盖 `text-left`
- Footer 中 bee.webp 是 MiniGame 入口（`rounded-xl border-line`，hover 上浮）

### 4.4 浮动按钮（FloatingButtons）

- 右下角固定竖排（`right-8 bottom-8`，移动端收窄）：**↑ 回顶部**、**🌐 语言**
- 圆形白底 `w-12 h-12` + `shadow-card` + 细边框；hover 边框转品牌色、上浮 `y:-3`；tap 浅蓝底
- 语言弹窗：遮罩 `bg-black/40` + 居中白卡（`rounded-xl shadow-card-hover`），内含 `LanguageSelector` 下拉（zh/en/ja/ko）

---

## 5. 信息架构与路由

| 路由 | 页面 | 布局要点 |
|---|---|---|
| `/` | 首页 | 活动横滚条 + 超大标题 + 马赛克谱面流（无限滚动） |
| `/login` `/register` `/forget` | 登录/注册/找回密码（同一组件三 Tab） | 胶囊 Tab + 居中白卡 |
| `/song?id=` | 谱面详情 | Hero + 信息区 + 预览 + 排行榜 + 评论区 |
| `/ranking` | 谱面周榜 | 4 个榜单分区（游玩/点赞/评论/下载） |
| `/ranking/user` | 用户总分榜 | `ScoreCount` 列表 |
| `/ranking/mmfc` | MMFC 打榜榜 | 活动横幅 + `MMFCScoreCount` |
| `/chart-events` | 活动列表 | 分类筛选 + 双列卡片 + 时间轴弹窗 |
| `/eventTag?id=` | 活动标签聚合 / 原创曲 | 横幅 + 相关谱面列表 |
| `/space?id=` | 个人空间 | 头像简介 + 最近游玩图表 + 上传谱面 + 谁爱玩 |
| `/user/charts` | 谱面管理 | 上传区（条款公告板）+ 我的谱面（可删/打标签） |
| `/user/profile` | 账号设置 | 头像上传 + 个人简介（Markdown）上传 |
| `/user/scores` | 个人成绩 | Combo 筛芯片 + 排序 + 统计 + 成绩卡网格 |
| `/user/collections` | 我的歌单 | 管理态歌单卡（删除/重命名） |
| `/collection/hiroba` | 歌单广场 | 圆角搜索 + 歌单卡网格 + 分页 |
| `/collection?id=` | 歌单详情 | 歌单信息 + 谱面列表（加入/移除） |
| `/minigame` | 小游戏 | WebGL MiniGame |
| `/qrauth?auth-id=` | 机台 QR 授权 | 机台信息确认卡 |
| `/edit` `/play` | 外部工具 | 302 跳转 docs.majdata.net |
| `*` | 404 | 大字 404 + 5s 倒计时自动回首页 |

受保护路由（`ProtectedRoute`）：`/user/*`、`/collection*`、`/qrauth`。

---

## 6. 核心组件规范

### 6.1 按钮

| 变体 | 类名特征 | 场景 |
|---|---|---|
| 主按钮 | `bg-primary hover:bg-primary-hover text-white rounded-lg h-12 px-6 font-semibold` | 下载、登录/注册提交、确认登录 |
| 次按钮 | `bg-surface border border-line hover:border-primary/40 hover:text-primary rounded-lg h-12 px-6` | 分享、收藏、返回上一页 |
| 文字按钮 | 无背景，`ink-2 hover:text-primary` | 顶栏登录、菜单项 |
| 圆图标按钮 | `rounded-full` + 边框，hover 品牌色/危险色 | 下载角标、删除、收藏心 |
| 胶囊 Tab | 容器 `bg-surface-2 rounded-full p-1`，选中项 `bg-surface border-line text-primary` | 首页 Tab、下载类型、登录页 Tab |

规则：主色单一（primary），危险操作一律 `danger` 色文字/描边；hover 统一 `transition-colors duration-150~200` + 可选 `-translate-y`。

### 6.2 卡片

- **马赛克谱面卡（首页）**：`aspect-[8/3]` 直角大图，hover `scale-[1.05]`（700ms）+ 居中 `+` 反色符号（`mix-blend-difference`），右上角难度块，右下角圆形下载钮（透明，hover `bg-white/15`）；下方标题 + hover 展开的蓝色短下划线（`w-0→w-8`）+ `artist · uploader` + 互动计数
- **横向歌单卡（SongCard）**：封面圆图（`CoverPic`）+ 标题/艺术家/上传者@谱师 + 难度 + 互动数；hover 上浮 + 阴影加深；管理态叠加删除与标签按钮
- **歌单卡（CollectionCard）**：左侧 `140×140` 封面（hover 时 1s 轮播多张封面），右侧名称/描述（2 行截断）/创建者/数量；hover 上浮；管理态禁点击
- **成绩卡（ScoreCard）**：`max-w-20rem h-40` 固定尺寸，左圆封面右信息，含 dx 精度 4 位小数、Combo 徽章、排名徽章、点赞钮
- **活动卡（EventsPage）**：横幅图 `aspect-[1279/372]`（hover 轻微放大）+ 标题 + 状态徽章 + 富文本描述 + 分类/时间

### 6.3 输入与表单

- 文本输入：`bg-surface border border-line focus:border-primary rounded-md p-4 outline-none`（登录/注册）；紧凑型 `h-10 px-4 rounded-lg`（首页搜索）；圆角 `rounded-full h-11`（歌单广场搜索）
- 统一：`placeholder:text-ink-3`、`transition-colors`；搜索带清空按钮（`×`，圆形 surface-2 底）
- 防抖：搜索统一 `use-debounced-callback` 500ms
- 提交按钮禁用态 `disabled:opacity-50`，提交中叠加半透明遮罩 + Spinner（登录卡）

### 6.4 徽章 / 状态

- 事件状态：进行中 `bg-ok` / 即将 `bg-primary` / 已结束 `bg-surface-2`，`rounded px-2 py-1 text-xs` + lucide 图标
- Combo：`rounded px-1.5 py-0.5 text-[0.65rem] font-bold`
- 排名：前三金/灰/铜（`amber-400` / `gray-300` / `amber-600`），其余 `surface-2`
- 标签：用户标签琥珀系（`bg-amber-50 border-amber-200 text-amber-700`），公共标签绿系（`bg-green-50`），胶囊形，hover 上浮，点击即搜索
- 难度：见 §3.2 色块

### 6.5 弹层

- **下拉（Dropdown）**：白底 `shadow-card border-line rounded-lg min-w-48`，淡入位移动画 150ms；支持点外关闭 / Esc
- **弹窗**：居中白卡（`bg-surface rounded-xl shadow-card-hover border-line`）+ `bg-black/40` 遮罩；动效 `AnimatePresence`（语言弹窗、TimelineModal、CollectionModal）
- **Tooltip**（Radix + Framer）：深底 `bg-[#1f2937] text-white rounded-lg px-3 py-1.5`，`delayDuration` 全局 200ms，支持 `plain` 透传自定义内容
- **Toast**：`react-toastify`，`bottom-center`、3s、无进度条、light 主题

### 6.6 状态组件

- **加载**：`LoadingSpinner` —— 3px 圆环 `border-primary/25 border-t-primary` 旋转 0.8s 线性无限；尺寸按场景 20~50px
- **空状态**：大号弱化文字（`text-[50px] text-center` 的 "暂无数据"）或图标 + `text-ink-3`（ScoreRanking EmptyState）
- **错误**：居中 "服务器错误" / "加载失败"
- **懒加载**：`LazyLoad`（IntersectionObserver，offset 300px）+ 图片 `loading="lazy"`

---

## 7. 页面级设计说明

### 7.1 首页（HomePage）

结构自上而下：

1. **最新活动横滚条**：取 7 个活动（进行中优先 → 即将 → 已结束，时间倒序），12 列网格双份复制做 45s 无缝横向滚动（`events-scroll-track`，hover 暂停，`prefers-reduced-motion` 关闭）；<6 条时静态网格。**两行活动之间插入放大版品牌字标 `MAJDATA.NET`**（`font-black tracking-tight text-4xl md:text-6xl`，`.NET` 用 `ink-3` 弱化，居中展示）
2. **超大标题**：左对齐 `text-3xl md:text-7xl font-black tracking-tight`（"全部谱面"/"随机推荐"），右侧 `pr-44 md:pr-64` 给控件留白；Tab 切换带淡入
3. **右上角控件**（绝对定位，无背景）：搜索框 + 排序下拉（上传/点赞/评论/播放）+ Tab 胶囊 + "换一批"（随机模式）
4. **马赛克谱面流**：7 卡一组（前 3 张随机跨列 3–6，后 4 张等宽 3），IntersectionObserver 无限滚动（rootMargin 500px），底部 "已加载全部"
5. **下载类型选择**：ZIP / ADX 胶囊（localStorage 持久化）

### 7.2 谱面详情（SongPage）

- **Hero**：返回按钮（贴封面左上角）→ 方形封面（`w-56 md:w-72 aspect-square`）→ 超大标题（点击回首页搜索该曲）+ 艺术家（点击搜索）；"All Difficulties" + 全难度色块；操作区：下载（主）/ 分享（复制链接）/ 收藏（开 CollectionModal）
- **信息区**（左 280px 栏 + 右预览）：上传者（头像+用户名+谱师）、标签（琥珀/绿胶囊 + 管理入口）、ID/HASH/上传时间（等宽复制）、点赞；右侧点击加载 **Unity WebGL Majdata 播放器**（黑底 `aspect-video` 占位 → 黑底 `aspect-square` 播放器，sticky）
- **排行榜**：等级 TabBar（`layoutId` 弹簧指示器、激活项 `bg-primary text-white`）+ 排名卡（# 徽章、前三头像金/灰/铜描边、dx 精度、Combo 徽章、Failed 红）→ 空状态
- **评论区**：发送器（文本域 + 主/次按钮）+ 评论卡片（头像、Markdown 渲染、回复楼、点赞、删除），分隔线 `bg-line h-px`

### 7.3 排行榜（RankingPage）

四分区（游玩/点赞/评论/下载），每区标题 + 说明 + 下边框，`SongList isRanking`（封面圆图左上角 "No.n" 角标）；整页滚动错峰入场（`delay-[100~400ms]`）。

### 7.4 活动页（EventsPage）

居中头部（"浏览所有活动 · 时间轴"链接）→ `EventsFilter` 分类胶囊 → 双列活动卡（hover 上浮 + 图片微放大）→ `TimelineModal` 时间轴弹窗。

### 7.5 个人空间（SpacePage）

1. 简介区：头像（`border-[3px] border-primary/40 rounded-full w-30`）+ 用户名 + 加入时间 + Markdown 自我介绍（`github-markdown-css` + 自定义居中语法 `[c]`）
2. 最近游玩：标题 + `w-[70%] h-px` 分隔线 + `RecentActivityChart`（纯 SVG 平滑折线，品牌蓝 `#5c8dc1`，920×260，含区间统计/今日/最新标签）
3. 已上传谱面：`SongList`
4. 谁爱玩：`ScoreCount`（按谱师聚合成绩）

各区 `slideInUp` 错峰入场（0.3/0.4/0.5s）。

### 7.6 个人成绩（ScoresPage）

- 顶部：Combo 筛芯片（AP+/AP/FC+/FC/未FC，选中色同 Combo 徽章规则，localStorage 持久化）+ 排序选择 + 筛选后统计（DX 总精度、经典总精度、DX 总分等）
- 成绩网格：`ScoreCard`（18 个/页），翻页平滑滚顶

### 7.7 认证页（ForginsterPage）

- 胶囊 Tab（登录/注册/找回）+ 白卡（`bg-surface border-line shadow-card rounded-xl p-8 md:p-12`）+ 居中标题/副标题
- 表单：label 上置（`ink-2 text-sm`），输入 `p-4 rounded-md`；主按钮全宽
- 注册含 Cloudflare Turnstile；登录成功后 `refetch` 用户态并按 `redirect` 参数回跳
- Tab 切换：`AnimatePresence mode="wait"` 横向滑动（±64px，0.32s）

### 7.8 歌单（Collections）

- **广场**：`rounded-full` 搜索 + 帮助 Tooltip；歌单卡网格（hover 封面轮播）；底部数字分页（页码跳转 + 上一页/下一页）
- **详情**：歌单信息头 + 谱面列表，可增删曲目
- **我的歌单**：管理态（删除二次确认、重命名）

### 7.9 404 / QR 授权 / 小游戏

- **404**：`text-[6rem]` 巨大 "404"，提示文案，`bg-primary-soft border-primary/30` 倒计时条（5s 自动回首页），主/次两个按钮
- **QR 授权**：居中确认卡，两块 `surface-2` 信息面板（机台信息/登录地点），主按钮 "确认登录"
- **小游戏**：居中 WebGL 容器

---

## 8. 响应式规范

| 断点 | 行为 |
|---|---|
| `<480px` | 卡片列表全宽（`SongCard flex-[1_1_100%]`） |
| `<500px` | h1 缩小至 2rem |
| `<640px` | 顶栏菜单按钮仅显示汉堡（隐藏 "MENU" 文字） |
| `<768px` | 封面/信息单列；浮动按钮右缘收窄；`SongCard` 弹性 150px 基宽 |
| `<1280px`（xl 以下） | 无桌面横向导航；全屏菜单是唯一导航入口 |
| `xl+` | 全宽马赛克、谱面详情双栏（`lg:grid-cols-[280px_1fr]`）、活动双列（`lg:grid-cols-2`） |

通用规则：`grid-cols-12` 响应式列（`col-span-12 md:col-span-*`）；图片 `object-cover` + 定比例（`aspect-[8/3]`、`aspect-square`）；文本 `truncate` 防溢出。

---

## 9. 动效规范（汇总）

| 场景 | 动效 |
|---|---|
| 页面区块入场 | fade + y:16~30，0.3~0.6s，`[0.25,0.1,0.25,1]` 或 `[0.4,0,0.2,1]`，按序 delay |
| 卡片入场（列表） | `whileInView` once，`delay: (i%5)*0.05`，0.45s |
| 卡片 hover | `-translate-y-0.5~1` + `shadow-card-hover` 0.2~0.3s |
| 图片 hover | `scale-[1.02~1.05]` 0.5~0.7s + 反色 `+` 淡入 |
| 全屏菜单 | 逐条 0.4s 错峰（0.08+i*0.05）上移淡入 |
| 下拉/弹窗 | 150~300ms 淡入 + 位移动画，遮罩淡入 |
| Tab 切换 | `AnimatePresence` 横向滑动；`layoutId` 弹簧指示器 |
| 按钮 | `whileHover scale 1.05~1.1`、`whileTap` 收缩 |
| 加载 | Spinner 旋转 0.8s 线性无限 |

无障碍：`prefers-reduced-motion` 时停用自动滚动动画（events 已实现，其余组件建议跟进）。

---

## 10. 国际化（i18n）规范

- 语言包：`public/i18n/{zh,en,ja,ko}.json`。**当前实际为扁平结构**（`{ "Key": "文案" }`），由 `loc()`/`getTranslatedString()` 消费；`i18n()`（命名空间格式 `路由/组件.Key`）需要 `{ "路由/组件": { "Key": "文案" } }` 结构，迁移完成前这些 key 会回退 fallback。加载校验 `isTranslationDictionary` 同时兼容两种结构（否则扁平语言包会被判为非法、加载抛错并回退默认语言，导致语言切换无效——曾为此 bug）
- 新代码用 `i18n('路由/组件.Key', fallback)`；存量代码保留 `loc(key, fallback)` 扁平 key 兼容层（`getTranslatedString`）
- 语言选择：右下角 🌐 浮动按钮 → 弹窗 → 下拉；持久化 `localStorage.language`，切换通过 `languageChange` 自定义事件驱动全站重渲染
- 提交前 `pnpm i18n:check` 校验 key 一致性
- 文案**必须带 fallback**，缺失 key 会 console.warn 并回退默认语言/fallback

---

## 11. 无障碍要点

- 所有图标按钮带 `aria-label`（下载/删除/关闭/菜单等）
- 导航/下拉支持 Esc 关闭、焦点回退（`FullScreenMenu`、`Dropdown`）
- 键盘焦点环：`focus-visible:ring-2 ring-blue-400/70`
- 图片 `alt` + `decoding="async"` + `loading="lazy"`
- 对比度：ink-3 仅用于弱化信息，避免承载关键内容
- 已知短板：全局 h1/h2 强制居中需逐页覆盖；部分旧组件（如 `LanguageSelector`）仍用 `gray-*` 原色系与 token 体系不一致

---

## 12. 实现载体与命名约定

- 样式：Tailwind 工具类内联为主；全局 token 在 `index.css`；组件级覆盖 `src/styles/components/events.css`；Markdown 覆写见 `index.css`
- 图标：**lucide-react**（新代码统一），旧代码残留 inline SVG / emoji
- 组件分层：`pages/`（路由页）→ `components/{domain}/`（song / score / user / collection / event / header / layout / chart / ui）
- 数据获取：SWR + `fetch`（`credentials: include`）；API 端点统一在 `src/config/api.ts`
- 动画：framer-motion 变体集中定义于各文件顶部（`slideInUp` 等），建议后续抽公共 `variants`

---

## 13. 已知问题与改进建议（代码审计发现）

1. ~~**死代码导航**~~：~~`src/components/header/Navigation.tsx`（深色玻璃风、`blue-400` 点缀、`xl` 断点）未被任何文件引用，与 v5 浅色 Quiet Flat 风格冲突~~ —— **已于本次清理中删除**（`Navigation.tsx`、`navigationItems.ts` 及其测试一并移除），深色导航体系不复存在。
2. **Token 命名不一致**：`index.css` 注释为 "v4 设计 Token"，git 与实现为 v5，建议统一注释为 v5。
3. **混用色系**：部分页面 inline style（`TagManageWidget`、`QRAuthPage`、`NotFoundPage` 动画）未消费 design tokens，建议统一迁移（`LanguageSelector` 已迁移为 token 色 + lucide 图标）。
4. **封面风格双轨**：列表 `CoverPic` 为圆形圆角，首页马赛克为直角大图 —— 属有意区分，但建议在文档/组件注释中固化规则，避免后续误统一。
5. **全局 h1/h2 居中** 是 `@layer base` 的全局规则，每页需 `text-left!` 反制，易漏；建议改为页面级类名控制。
6. **无障碍**：多数交互按钮已带 aria-label，但自定义下拉（`Dropdown`）缺 `aria-expanded`/键盘导航；全屏菜单无焦点陷阱；建议后续补齐。
7. **i18n 双轨 API**（`i18n()` 与 `loc()`）并存，README 与代码注释不一致，建议排期统一。
8. **主题**：`color-scheme: only light`，无深色模式设计；若未来支持需先扩展 token（旧 Navigation 的深色体系已随死代码删除）。

---

## 14. 附录：关键文件索引

| 关注点 | 文件 |
|---|---|
| 设计令牌 | `src/index.css` |
| 应用壳 | `src/App.tsx`、`src/components/layout/PageLayout.tsx` |
| 顶栏/全屏菜单 | `src/components/header/index.tsx`、`FullScreenMenu.tsx`、`UserMenu.tsx`、`Dropdown.tsx` |
| 首页 | `src/pages/HomePage.tsx` |
| 谱面详情 | `src/pages/SongPage.tsx`、`components/song/*` |
| 排行榜 | `src/pages/RankingPage.tsx`、`components/song/ScoreRanking.tsx` |
| 活动 | `src/pages/EventsPage.tsx`、`EventTagPage.tsx`、`components/event/*` |
| 个人空间/成绩 | `src/pages/SpacePage.tsx`、`user/ScoresPage.tsx` |
| 歌单 | `src/pages/collection/*`、`user/CollectionPage.tsx`、`components/collection/*` |
| 认证 | `src/pages/ForginsterPage.tsx`、`QRAuthPage.tsx` |
| i18n | `src/config/i18n.ts`、`src/utils/i18n.ts`、`public/i18n/*.json` |
| 数据模型 | `src/types/*`、`src/config/api.ts` |
