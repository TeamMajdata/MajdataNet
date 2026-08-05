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

## 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) / npm / yarn

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
