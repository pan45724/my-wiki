好的，这是为您整理的 **LobeChat 完整部署指南 (进阶版：支持数据同步)**，包含了从零开始到解决所有报错的完整流程。您可以直接复制保存为 `LobeChat_Deployment.md`。

---

# 🚀 LobeChat 全栈部署指南 (Vercel + Neon + R2)

本文档记录了基于 **LobeChat (前端)** + **OneAPI (模型中转)** + **Neon (数据库)** + **Cloudflare R2 (文件存储)** 的免费全栈部署方案。此方案支持多端数据同步（手机/电脑互通）。

## 🏗️ 架构概览

*   **前端托管**: Vercel (Next.js)
*   **模型中转**: OneAPI (部署在 Render)
*   **数据库**: Neon (PostgreSQL Serverless) - *用于存聊天记录*
*   **文件存储**: Cloudflare R2 (S3 兼容) - *用于存图片/文件*
*   **身份验证**: Clerk - *用于多用户登录*

---

## 🛠️ 第一阶段：准备后端基础设施

### 1. 部署 OneAPI (模型聚合)
*   **平台**: [Render](https://render.com)
*   **镜像**: `justsong/one-api:latest`
*   **数据库**: TiDB Cloud (MySQL)
*   **关键环境变量**:
    *   `SQL_DSN`: `user:pass@tcp(host:4000)/db?tls=true`
*   **保活**: 使用 UptimeRobot 监控 Render 服务的 **主页** (不是 `/api/status`)。
*   **操作**: 创建令牌 (Token)，记为 `sk-oneapi-token`。

### 2. 准备数据库 (Neon Postgres)
*   **平台**: [Neon.tech](https://neon.tech)
*   **操作**:
    1.  创建新项目。
    2.  复制 **Connection String** (确保勾选 Pooled connection)。
    3.  记下连接串，即 `DATABASE_URL`。

### 3. 准备文件存储 (Cloudflare R2)
*   **平台**: [Cloudflare R2](https://dash.cloudflare.com/)
*   **操作**:
    1.  创建 Bucket (例如 `lobe-files`)。
    2.  进入 Bucket 设置，复制 **S3 API** 地址（去掉末尾的 `/桶名`）。
    3.  点击 "Manage R2 API Tokens" -> 创建 Admin 读写权限 Token。
    4.  记下 `Access Key ID` 和 `Secret Access Key`。

### 4. 准备身份验证 (Clerk)
*   **平台**: [Clerk.com](https://clerk.com)
*   **操作**:
    1.  创建应用，开启 Email/Google/GitHub 登录。
    2.  在 "API Keys" 页面复制：
        *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
        *   `CLERK_SECRET_KEY`

---

## ⚡ 第二阶段：Vercel 一键部署

1.  访问 [LobeChat GitHub](https://github.com/lobehub/lobe-chat)。
2.  点击 **Deploy to Vercel**。
3.  创建项目，**先不要管环境变量**，直接点击 Deploy (第一次部署可能会因为缺变量报错，无所谓)。

---

## ⚙️ 第三阶段：配置环境变量 (核心)

进入 Vercel 项目 -> **Settings** -> **Environment Variables**，添加以下变量。

**⚠️ 重要提示：** 所有变量的 Environments 范围必须勾选 **Production, Preview, Development** (即 All Environments)。

### 1. 基础服务配置
| 变量名 | 值 (示例) | 说明 |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | `sk-oneapi-token` | OneAPI 生成的令牌 |
| `OPENAI_PROXY_URL` | `https://your-api.onrender.com/v1` | **必带 /v1**，末尾无斜杠 |
| `LOBE_CHAT_SECRET` | `(随机生成的32位乱码)` | 用于加密，越长越好 |
| `BETTER_AUTH_SECRET` | `(同上)` | 必须填，否则构建报错 |
| `KEY_VAULTS_SECRET` | `(同上)` | 必须填，否则数据库模式报错 |

### 2. 数据库模式 (Server Mode)
| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SERVICE_MODE` | `server` | 开启服务端同步模式 |
| `DATABASE_URL` | `postgres://...` | Neon 数据库连接串 |

### 3. 身份验证 (Clerk)
| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_ENABLED_CLERK_AUTH` | `1` | 开启 Clerk |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`| `pk_test_...` | Clerk 公钥 |
| `CLERK_SECRET_KEY` | `sk_test_...` | Clerk 私钥 |
| `CLERK_WEBHOOK_SECRET` | `whsec_fake123456` | **填假数据即可**，骗过构建检查 |

### 4. 文件存储 (S3 / R2)
| 变量名 | 值 | 说明 |
| :--- | :--- | :--- |
| `S3_ACCESS_KEY_ID` | `(CF R2 Access Key)` | |
| `S3_SECRET_ACCESS_KEY` | `(CF R2 Secret Key)` | |
| `S3_ENDPOINT` | `https://xxxx.r2.cloudflarestorage.com` | **注意：末尾不要带 /桶名** |
| `S3_BUCKET` | `lobe-files` | 你的存储桶名称 |
| `S3_REGION` | `auto` | **必填**，否则报错 `not set completely` |

---

## 🔄 第四阶段：生效与验证

1.  **强制重新部署 (Redeploy)**：
    *   进入 Vercel -> **Deployments**。
    *   找到最新的一条记录 -> 点击右侧 `...` -> **Redeploy**。
    *   等待构建完成（状态变绿）。

2.  **访问验证**：
    *   打开你的 Vercel 域名（建议绑定自定义域名以防被墙）。
    *   此时应该会跳转到 Clerk 登录页面。
    *   登录后，尝试发送消息。
    *   尝试发送一张图片（测试 S3）。
    *   换个浏览器登录同一账号，检查历史记录是否同步。

---

## ❓ 常见报错排查 (Troubleshooting)

### 1. `Message sending failed: UNAUTHORIZED`
*   **原因**：OneAPI 连接失败。
*   **检查**：
    *   `OPENAI_PROXY_URL` 是否漏了 `/v1`？
    *   `OPENAI_API_KEY` 是否填错？
    *   **网页端设置**（Settings -> AI Service Provider -> OpenAI）里是否手动填了 Key？**必须清空网页端设置**。

### 2. `S3 environment variables are not set completely`
*   **原因**：S3 变量缺失。
*   **检查**：
    *   是否漏了 `S3_REGION` (填 `auto`)？
    *   `S3_ENDPOINT` 末尾是不是多余带了桶名？

### 3. `Build error: KEY_VAULTS_SECRET / BETTER_AUTH_SECRET is not set`
*   **原因**：变量作用域不对。
*   **检查**：
    *   Vercel 变量列表里，这些变量下面是否写着 **Production**？如果是 `Development`，请编辑并勾选所有环境，然后 **Redeploy**。

### 4. `Error: Vulnerable version of Next.js detected`
*   **原因**：代码库太旧。
*   **解决**：在 GitHub 上 Sync Fork 最新代码，Vercel 会自动重部署。

---

> **简易版回退方案：**
> 如果觉得配置数据库和 S3 太麻烦，只需在 Vercel 删掉 `NEXT_PUBLIC_SERVICE_MODE` 及其下方所有数据库/S3/Clerk 相关变量，保留 `OPENAI_...` 和 `ACCESS_CODE`，即可回退到**本地存储版**（无数据同步，但在单机上完全可用）。