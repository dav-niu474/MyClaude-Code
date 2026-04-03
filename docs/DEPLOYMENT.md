# MyClaude Code - Vercel Deployment Guide

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (free tier works)
2. A PostgreSQL database (recommended options):
   - [Neon](https://neon.tech/) — Free serverless PostgreSQL
   - [Supabase](https://supabase.com/) — Free PostgreSQL with 500MB
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - [Railway](https://railway.app/) — $5 free credit

## Deployment Steps

### Option A: Deploy via GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   # Create a new repository on GitHub, then:
   cd /home/z/my-project
   git remote add origin https://github.com/YOUR_USERNAME/my-claude-code.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   In Vercel project settings > Environment Variables, add:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   ```

4. **Deploy**
   Click "Deploy" — Vercel handles everything automatically.

---

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Set up PostgreSQL database**
   Get a free database from [Neon](https://neon.tech/):
   - Create a project
   - Copy the connection string

4. **Deploy**
   ```bash
   cd /home/z/my-project
   vercel
   ```
   Follow the prompts. When asked about environment variables, set:
   ```
   DATABASE_URL = your-postgresql-connection-string
   ```

5. **Production deploy**
   ```bash
   vercel --prod
   ```

---

### After Deployment: Run Migrations

Since we use Prisma, you need to push the schema to the production database:

```bash
# Set the production DATABASE_URL temporarily
export DATABASE_URL="your-production-postgresql-url"

# Push schema
npx prisma db push
```

Or in Vercel, go to the "Exec" tab in your deployment and run:
```bash
npx prisma db push
```

---

### Important Notes

1. **Database**: The local SQLite database will NOT work on Vercel (serverless).
   You MUST use a PostgreSQL database for production.

2. **z-ai-web-dev-sdk**: This SDK is used in server-side API routes only.
   Make sure it works in Vercel's serverless environment.

3. **Build**: The `postinstall` script will automatically run `prisma generate`
   on Vercel to generate the Prisma Client.

4. **Environment**: Set `DATABASE_URL` in Vercel dashboard under
   Settings > Environment Variables.
