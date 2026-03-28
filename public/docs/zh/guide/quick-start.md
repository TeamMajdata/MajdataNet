# 快速开始

本页说明如何在现有项目中新增文档条目。

## 第一步：添加 markdown 文件

在语言目录下新增文件，例如：

```text
public/docs/zh/guide/new-topic.md
```

## 第二步：更新结构文件

在 `_structure.json` 里添加一个节点：

```json
{
  "title": "新主题",
  "slug": "guide/new-topic"
}
```

## 第三步：验证路由

访问 `/docs/guide/new-topic`，确认内容可以渲染并出现在侧栏中。
