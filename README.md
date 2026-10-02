# my-wiki

后端架构、团队管理与 AI 落地的实战笔记。基于 [VitePress](https://vitepress.dev/) 构建的静态站点。

> 这个文件只给 GitHub 首页看，不会渲染成站点页面（已在 `srcExclude` 中排除）。

## 目录结构

```
.
├── index.md                    # 首页（个人名片 + 分区入口）
├── about.md                    # 关于页
├── posts/                      # 所有文章，按主题分目录
│   ├── cicd/                   # 运维与 CI/CD
│   ├── network/                # 网络与路由
│   ├── ai/                     # AI 自建服务
│   ├── devops/                 # 网站搭建与部署
│   ├── biz/                    # 变现与引流
│   └── _drafts/                # 草稿（不参与构建）
├── public/                     # 静态资源，原样拷到站点根目录
│   └── img/                    # 文章配图，按文章名建子目录
└── .vitepress/
    ├── config.mjs              # 站点配置：nav / sidebar / 广告开关都在这
    └── theme/                  # 自定义主题
```

## 本地开发

```bash
npm install
npm run docs:dev        # http://localhost:5173
npm run docs:build      # 产物在 .vitepress/dist
npm run docs:preview    # 预览构建产物
```

## 写一篇新文章

1. 在对应主题目录下新建小写连字符命名的文件，例如 `posts/ai/my-new-post.md`
2. 加上 frontmatter：

```yaml
---
title: 文章标题
description: 一句话摘要，会用于搜索和 meta description
tags: [标签1, 标签2]
---

# 文章标题

正文……
```

3. 在 `.vitepress/config.mjs` 的 `sidebar` 里对应分组加一条

不需要手写日期——页脚的「最后更新」自动读 git 提交时间。

## 约定

- 文件名：小写 + 连字符，不用中文、不用大写
- 每篇文章开头直接是 `# 标题`，不要留和读者的寒暄
- 涉及操作步骤的，附上完整命令；撞过报错的，写进「故障排查」小节
- 图片放 `public/img/<文章名>/`，用 `/img/<文章名>/xxx.png` 引用

## 部署

推到 GitHub 后由 Cloudflare Pages 自动构建：

| 配置项 | 值 |
| :--- | :--- |
| Framework preset | VitePress |
| Build command | `npm run docs:build` |
| Build output directory | `.vitepress/dist` |
| Node 版本 | 环境变量 `NODE_VERSION=20` |

详细步骤见 [VitePress + Cloudflare Pages 部署指南](https://github.com/pan45724/my-wiki)。

## License

MIT
