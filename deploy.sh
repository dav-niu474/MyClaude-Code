#!/bin/bash
# ================================================================
# MyClaude Code - 一键部署脚本
# ================================================================
# 使用方法:
#   1. 设置环境变量:
#      export VERCEL_TOKEN="your-vercel-token"
#      export NEON_API_KEY="your-neon-api-key" (可选)
#   2. 运行: bash deploy.sh
# ================================================================

set -e

# 从环境变量读取 token
VERCEL_TOKEN="${VERCEL_TOKEN:?请设置 VERCEL_TOKEN 环境变量}"
REPO="dav-niu474/MyClaude-Code"
PROJECT_NAME="my-claude-code"

echo "🚀 MyClaude Code - 一键部署"
echo "================================"

# Step 1: 检查 Vercel 登录状态
echo ""
echo "📌 Step 1: 检查 Vercel 登录状态..."
USER_INFO=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/user")
USERNAME=$(echo $USER_INFO | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('username','unknown'))" 2>/dev/null)
echo "   当前用户: $USERNAME"

# Step 2: 测试是否能访问 projects (检测 SAML 状态)
echo ""
echo "📌 Step 2: 检查 SAML 状态..."
TEST_PROJECT=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects")
if [ "$TEST_PROJECT" = "403" ]; then
    echo "   ⚠️  SAML 需要重新认证!"
    echo ""
    echo "   👉 请在浏览器中打开以下链接完成认证:"
    echo "   https://vercel.com/login"
    echo ""
    echo "   登录完成后，重新运行此脚本。"
    exit 1
fi
echo "   ✅ SAML 认证已通过"

# Step 3: 创建 Vercel 项目
echo ""
echo "📌 Step 3: 创建 Vercel 项目..."
CREATE_RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$PROJECT_NAME\",\"framework\":\"nextjs\"}" \
    "https://api.vercel.com/v10/projects")

PROJECT_ID=$(echo $CREATE_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "   ⚠️  项目创建失败，可能已存在。尝试查找..."
    LIST_RESULT=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects")
    PROJECT_ID=$(echo $LIST_RESULT | python3 -c "
import sys,json
data = json.load(sys.stdin)
for p in data.get('projects',[]):
    if p.get('name') == '$PROJECT_NAME':
        print(p.get('id'))
        break
" 2>/dev/null)
fi

if [ -z "$PROJECT_ID" ]; then
    echo "   ❌ 无法创建或找到项目"
    exit 1
fi
echo "   ✅ 项目 ID: $PROJECT_ID"

# Step 4: 创建 Neon 数据库
echo ""
echo "📌 Step 4: 创建 Neon PostgreSQL 数据库..."
if [ -n "$NEON_API_KEY" ]; then
    NEON_RESULT=$(curl -s -X POST \
        -H "Authorization: Bearer $NEON_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"name":"my-claude-code-db"}' \
        "https://console.neon.tech/api/v1/projects")
    DATABASE_URL=$(echo $NEON_RESULT | python3 -c "
import sys,json
data = json.load(sys.stdin)
branches = data.get('branches',[])
if branches:
    endpoints = branches[0].get('endpoints',[])
    if endpoints:
        host = endpoints[0].get('host','')
        user = endpoints[0].get('user','')
        password = data.get('branchPassword','')
        db = branches[0].get('databaseName','')
        print(f'postgresql://{user}:{password}@{host}/{db}?sslmode=require')
" 2>/dev/null)
    if [ -n "$DATABASE_URL" ]; then
        echo "   ✅ 数据库已创建"
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo "   ⏭️  请手动输入数据库连接字符串"
    echo "   免费创建: https://console.neon.tech/app/projects"
    read -p "   DATABASE_URL (postgresql://...): " DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
    echo "   ❌ 未提供 DATABASE_URL"
    exit 1
fi

# Step 5: 设置环境变量
echo ""
echo "📌 Step 5: 设置环境变量..."
curl -s -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"DATABASE_URL\",\"value\":\"$DATABASE_URL\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}" \
    "https://api.vercel.com/v9/projects/$PROJECT_ID/env" > /dev/null
echo "   ✅ DATABASE_URL 已设置"

# Step 6: 部署
echo ""
echo "📌 Step 6: 开始部署..."
DEPLOY_RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\":\"$PROJECT_NAME\",
        \"gitSource\":{\"type\":\"github\",\"repoId\":1200076762,\"ref\":\"main\"},
        \"projectSettings\":{\"framework\":\"nextjs\",\"buildCommand\":\"npx prisma generate && next build\"}
    }" \
    "https://api.vercel.com/v13/deployments")

DEPLOY_URL=$(echo $DEPLOY_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)

if [ -n "$DEPLOY_URL" ]; then
    echo "   ✅ 部署成功!"
    echo ""
    echo "================================================="
    echo "🎉 MyClaude Code 已部署!"
    echo "================================================="
    echo "   🌐 地址: $DEPLOY_URL"
    echo "   🗄️  数据库: Neon PostgreSQL"
else
    echo "   ⚠️  自动部署失败"
    echo "   请手动操作: https://vercel.com/new"
fi
