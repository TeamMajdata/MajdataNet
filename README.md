# Majdata Net

## 项目简介

MajdataNet v2. 你可以在 [Branch Legacy](https://github.com/TeamMajdata/MajdataNet/tree/legacy) 找到v1

## 技术栈

- React 19
- TypeScript
- Vite 7
- Tailwind CSS 4
- React Router 7
- Axios
- SWR (数据获取)
- Framer Motion (动画)
- i18n (国际化支持)

## i18n 约定

语言包位于 `public/i18n`。每个一级 key 使用 `路由/组件` 命名空间，组件内的文案放在该命名空间对象中：

```json
{
  "song/SongPage": {
    "Download": "Download"
  }
}
```

代码中统一通过 `i18n('路由/组件.key')` 使用，例如 `i18n('song/SongPage.Download')`。提交前运行 `pnpm i18n:check`，检查语言包结构、各语言 key 一致性、源码引用和废弃 key。

## 装饰看板娘维护

小小蓝白的 Live2D 模型复用 MMFC 项目的现有素材，资源来源和使用授权说明位于 `public/live2d/xiaoxiaolanbai/NOTICE.txt`。她在宽度大于 768px 的页面中成功加载后常驻，只提供本地戳一戳动作和短对白；手机端完全隐藏且不请求模型，浏览器全屏期间也隐藏，不接入答疑或 AI 服务。四种语言的对白统一放在 `shared/Live2DMascot` 命名空间中。

运行库精确固定为 `l2d@2.1.1`，通过动态导入延后加载。该版本包含内联兼容脚本和 WebAssembly；若部署环境配置了 CSP，其 `script-src` 需要允许 `'wasm-unsafe-eval'` 和 `'sha256-YSrAb8iIwZP/5DKDH/s4MXKZZ7IMyUSz3G3JYyi70q0='`。升级运行库时应重新校验内联脚本哈希，本次功能不添加或调整全站 CSP。

运行 `pnpm test:e2e` 验收 1440px 桌面与 390px 手机视口，截图写入 `test-results/`，报告位于 `playwright-report/`。Windows 默认使用已安装的 Edge；其他系统先运行 `pnpm exec playwright install chromium`，也可以通过 `PLAYWRIGHT_CHANNEL` 指定浏览器。测试使用本地 API 数据和播放器替身，Live2D 使用真实模型资源。

运行时以 `loaded` 事件确认成功；加载期间保持隐藏，15 秒超时或加载失败后当前页面直接隐藏角色，不显示回退头像、提示或空白点击区。角色没有收起功能，也不使用任何头像；点击气泡只关闭对白，模型继续显示。拖动或方向键调整的位置保存在本地；读取旧存档时保留位置，忽略旧的 `collapsed` 状态。由于此版本运行库无法取消资源加载，超时任务仍由原控制器持有，待异步加载收尾后释放；不要在超时或切换页面时启动并行实例。

## 快速开始

### 环境要求

- Node.js 22（与 CI 一致）
- pnpm 10（版本固定在 `packageManager`；可用 `corepack pnpm` 调用）

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 <http://localhost:3000> 查看应用。

### 构建生产版本

```bash
pnpm build
```

构建产物将输出到 `dist` 目录。

### 预览生产构建

```bash
pnpm preview
```

### 代码检查

```bash
pnpm lint
```

## 项目结构

```
src/
├── components/        # 可复用组件
├── pages/            # 页面组件
├── contexts/         # React Context
├── hooks/            # 自定义Hooks
├── utils/            # 工具函数
├── types/            # TypeScript类型定义
├── config/           # 配置文件
├── styles/           # 样式文件
└── assets/           # 静态资源

public/               # 公共资源
├── i18n/            # 国际化翻译文件
├── icons/           # 图标
├── MiniGame/        # 小游戏资源
└── WebGLBuild/      # WebGL构建资源
```

## 路由说明

- `/` - 首页
- `/login` - 登录页
- `/register` - 注册页
- `/edit` - 谱面编辑页
- `/song` - 谱面详情页
- `/events` - 活动列表页
- `/eventTag` - 活动标签页
- `/ranking` - 谱面排行榜
- `/user-ranking` - 用户排行榜
- `/mmfc-ranking` - MMFC排行榜
- `/user` - 用户主页
- `/user/charts` - 用户谱面列表
- `/user/profile` - 用户资料页
- `/space` - 个人空间
- `/minigame` - 小游戏页

## 国际化

本项目支持以下语言：

- 中文 (zh)
- English (en)
- 日本語 (ja)
- 한국어 (ko)

翻译文件位于 `public/i18n/` 目录。

## 开发规范

### TypeScript

项目使用严格的TypeScript配置，所有类型定义位于 `src/types/` 目录。

### 组件开发

- 使用函数式组件和Hooks
- 组件应当保持单一职责
- 复用性高的组件放在 `src/components/`
- 页面级组件放在 `src/pages/`

### 样式规范

- 使用Tailwind CSS进行样式开发
- 自定义样式放在对应的CSS文件中
- 保持样式的响应式设计

### 代码风格

项目使用ESLint进行代码规范检查。提交代码前请确保：

```bash
pnpm lint
```

没有错误和警告。

## API配置

API相关配置位于 `src/config/` 目录：

- `api.ts` - API端点配置
- `axios.ts` - Axios实例配置
- `apiRetCode.ts` - API返回码定义

## 贡献指南

欢迎提交Issue和Pull Request。

在提交PR前，请确保：

1. 代码通过ESLint检查
2. 新功能有对应的类型定义
3. 重要功能有注释说明
4. 测试功能正常运行

## 许可证

[GNU](./LICENSE)

gitattributes file is from [gitattributes/gitattributes](https://github.com/gitattributes/gitattributes/blob/master/Web.gitattributes)

## 联系方式

如有问题或建议，欢迎通过Issue反馈。

## 活动配置

`public/events.json` 使用 `type` 和 `asset` 定义跳转目标，不再填写 `href`：

| type | asset |
| --- | --- |
| `outerLink` | 完整外部 URL |
| `eventTag` | 活动标签 ID |
| `space` | 用户空间 ID |
| `season` | 季赛歌单 ID |

`asset` 中的 ID 直接填写原文（包括中文和空格），无需 URL 编码。页面通过 `getEventHref` 统一生成跳转地址。`category` 仍用于活动分类和筛选；季赛页面通过活动自身的 `id` 定位（`/season?id=<活动 id>`），曲目从 `asset` 指向的歌单动态加载，不在活动配置中保存。
