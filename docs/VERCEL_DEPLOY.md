# ⚡ Vercel 快速部署指南

## 当前状态

✅ GitHub 仓库已就绪: https://github.com/dav-niu474/MyClaude-Code
✅ 分支策略已配置: main, develop, feature/auth-system, tag v1.0.0
❌ Vercel 部署需要您手动完成 SAML 重新认证

---

## 部署步骤（只需 3 分钟）

### 方式一：通过 Vercel 网站（推荐 ✅）

1. 打开 https://vercel.com/login
2. 用您的账号登录
3. 如果弹出 SAML 认证，请完成它
4. 进入 https://vercel.com/new
5. 选择 "Import Git Repository"
6. 搜索并选择 `dav-niu474/MyClaude-Code`
7. 点击 "Import"
8. 配置如下：
   - **Framework Preset**: Next.js (自动检测)
   - **Build Command**: `npx prisma generate && npm run build`
   - **Environment Variables**:
     ```
     DATABASE_URL = postgresql://user:password@host:5432/dbname?sslmode=require
     ```
   - *(注：推荐使用 [Neon](https://neon.tech/) 免费数据库)*
9. 点击 "Deploy"

---

### 方式二：通过 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 (完成 SAML 认证)
vercel login

# 3. 进入项目目录
cd my-claude-code

# 4. 部署
vercel --prod

# 5. 设置环境变量
vercel env add DATABASE_URL
# 输入您的 PostgreSQL 连接字符串
```

---

### 重要提醒

> ⚠️ **数据库**: Vercel 是无服务器环境，不支持 SQLite。
> 您必须使用 PostgreSQL 数据库（推荐 Neon 免费版）。
>
> 📌 部署完成后，需要运行数据库迁移：
> ```bash
> vercel env pull .env.local
> npx prisma db push
> vercel --prod
> ```

---

### Git 分支结构

```
main (生产分支) ──tag: v1.0.0
  └── develop (开发分支)
       └── feature/auth-system (功能分支)
```

所有分支已推送到 GitHub: https://github.com/dav-niu474/MyClaude-Code
