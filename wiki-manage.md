***

````markdown
# VitePress 部署指南：GitHub + Cloudflare Pages

本文档将指导你如何将 VitePress 构建的 Wiki 文档托管到 GitHub，并通过 Cloudflare Pages 实现自动构建与免费发布。

## 方案优势
- **零成本**：VitePress、GitHub 仓库、Cloudflare Pages 均为免费使用。
- **极速访问**：Cloudflare 拥有全球 CDN 节点。
- **自动化**：配置一次后，只需推送代码 (Git Push) 即可自动更新网站。
- **自带 SSL**：自动配置 HTTPS 证书。

---

## 1. 本地环境准备

确保你的电脑已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

### 1.1 初始化项目
打开终端（Terminal）或命令行工具：

```bash
# 1. 创建并进入项目文件夹
mkdir my-wiki
cd my-wiki

# 2. 初始化 package.json
npm init -y

# 3. 安装 VitePress
npm add -D vitepress

# 4. 运行安装向导 (跟随提示操作)
npx vitepress init
```

**配置向导建议：**
- `Where should VitePress initialize the config?` -> **直接回车** (./)
- `Site title` -> 输入你的网站标题
- `Site description` -> 输入网站描述
- `Theme` -> **Default Theme**
- `Use TypeScript config?` -> **Yes**
- `Add VitePress npm scripts to package.json?` -> **Yes** (重要)

### 1.2 本地预览
```bash
npm run docs:dev
```
访问 `http://localhost:5173` 确认网站运行正常。

---

## 2. 上传至 GitHub

### 2.1 配置 .gitignore
在项目根目录创建 `.gitignore` 文件，防止上传垃圾文件：

```text
node_modules
.DS_Store
dist
cache
.vitepress/dist
.vitepress/cache
```

### 2.2 推送代码
1. 在 [GitHub](https://github.com/) 创建一个新的空仓库（Repository），例如命名为 `my-wiki`。
2. 在本地终端执行以下命令：

```bash
git init
git add .
git commit -m "init vitepress project"
git branch -M main

# 将下面的 URL 替换为你自己的仓库地址
git remote add origin https://github.com/你的用户名/my-wiki.git

git push -u origin main
```

---

## 3. Cloudflare Pages 部署

### 3.1 创建应用
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** > **Overview**。
3. 点击 **Create application** > 选择 **Pages** 标签 > 点击 **Connect to Git**。

### 3.2 授权与配置
1. 选择刚才创建的 GitHub 仓库 `my-wiki`，点击 **Begin setup**。
2. **构建设置 (Build settings)** - **关键步骤**：

| 配置项 | 填写内容 | 说明 |
| :--- | :--- | :--- |
| **Project name** | `my-wiki` | 决定你的免费域名 (如 `my-wiki.pages.dev`) |
| **Production branch** | `main` | 主分支 |
| **Framework preset** | **VitePress** | 必须选择此项 |
| **Build command** | `npm run docs:build` | 对应 package.json 中的脚本 |
| **Build output directory** | `.vitepress/dist` | 默认输出路径，勿填错 |

> **注意**：如果你修改了文档目录结构（例如放在 `/docs` 下），输出目录可能是 `docs/.vitepress/dist`。请以本地构建生成的 dist 位置为准。

3. 点击 **Save and Deploy**。

---

## 4. 验证与后续维护

### 4.1 访问网站
等待 Cloudflare 构建完成（通常几十秒），看到 **Success** 状态后，点击页面顶部的链接（例如 `https://my-wiki.pages.dev`）即可访问。

### 4.2 日常更新
后续更新文档，只需在本地编辑 Markdown 文件，然后执行 Git 命令：

```bash
git add .
git commit -m "更新文档内容"
git push
```
Cloudflare 会监听 GitHub 的变动，自动触发重新打包和发布。

---

## 5. 常见问题 (FAQ)

### Q1: 构建失败，提示 Node 版本问题？
**解决**：VitePress 可能需要较新的 Node 版本。
1. 在 Cloudflare 项目页面 > **Settings** > **Environment variables**。
2. 添加变量：
   - Variable name: `NODE_VERSION`
   - Value: `20` (或 18)
3. 重新部署 (Retry deployment)。

### Q2: 网站能打开，但样式丢失 (404)？
**解决**：通常是 Base URL 配置错误。
- 如果部署在根域名（如 `xxx.pages.dev` 或 `docs.com`），确保 `.vitepress/config.mts` 中**没有**设置 `base`，或者设置为了 `base: '/'`。
- 不要随意设置 `base: '/my-wiki/'`，除非你确实要部署在子目录下。

### Q3: 如何绑定自定义域名？
**解决**：
1. 在 Cloudflare 项目页面 > **Custom domains**。
2. 点击 **Set up a custom domain**。
3. 输入你的域名（如 `wiki.yourdomain.com`），按照提示配置 DNS 记录即可。
````