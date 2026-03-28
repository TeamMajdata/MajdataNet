# Majdata Docs

欢迎来到 Majdata 文档站。这里使用当前项目中的 github-markdown 渲染能力，并提供：

- 左侧可折叠导航
- 右侧当前页 TOC
- 代码块高亮
- 上一页 / 下一页
- 客户端文档搜索

## 目录结构建议

建议将文档按照功能模块拆分为独立 markdown 文件，并在 `_structure.json` 中维护导航树顺序。

## 一个示例代码块

```ts
export function hello(name: string): string {
  return `hello, ${name}`;
}
```

## 下一步

你可以继续阅读快速开始章节，了解如何新增文档页面。
