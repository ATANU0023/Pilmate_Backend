# Pilmate Backend - Quick Setup Guide

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

5. Navigate to **Settings** → **Database**
6. Under **Connection string**, select **URI** tab
7. Copy the connection string → `DATABASE_URL`
8. Replace `[YOUR-PASSWORD]` with your actual database password

### 2. Configure .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres.[project-id]:your-password@aws-0-region.pooler.supabase.com:5432/postgres?schema=public
   JWT_SECRET=generate-a-secure-random-string-here
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations (creates tables)
npm run prisma:migrate
```

When prompted, give your migration a name like "init"

### 5. Start the Server

```bash
npm run start:dev
```

You should see:
```
🚀 Application is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/v1
```

### 6. Verify Installation

Open your browser and visit:
- http://localhost:3000/api/v1

You should get a response (likely 404 or a default message, which is normal).

### 7. (Optional) View Database

```bash
npm run prisma:studio
```

This opens Prisma Studio at http://localhost:5555 where you can view and edit your database visually.

## Common Issues

### Issue: "DATABASE_URL is not defined"
**Solution**: Make sure your `.env` file exists and has the correct `DATABASE_URL`

### Issue: "P3005: Database schema is not empty"
**Solution**: If you have existing data, use `npm run prisma:deploy` instead, or clear the database first

### Issue: "Port 3000 is already in use"
**Solution**: Either stop the other service or change the PORT in `.env`

### Issue: Migration fails
**Solution**: 
1. Check your DATABASE_URL is correct
2. Ensure your Supabase database is accessible
3. Check firewall/network settings

## Next Steps

1. **Implement Authentication**: Set up Supabase auth and JWT validation
2. **Create DTOs**: Define data transfer objects for validation
3. **Build CRUD Operations**: Implement create, read, update, delete for each module
4. **Add Business Logic**: Stock management, sales processing, etc.
5. **Write Tests**: Unit and integration tests
6. **Deploy**: Push to production (Render, Railway, AWS, etc.)

## Testing the Setup

Try these commands to verify everything works:

```bash
# Check if server starts
npm run start:dev

# Run Prisma Studio
npm run prisma:studio

# Build for production
npm run build

# Run tests (when implemented)
npm test
```

## Need Help?

- Prisma Docs: https://www.prisma.io/docs
- NestJS Docs: https://docs.nestjs.com
- Supabase Docs: https://supabase.com/docs
- Create an issue in your repository

---

**Your backend is now ready! 🎉**
