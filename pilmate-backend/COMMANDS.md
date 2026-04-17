# 🚀 Commands Reference - Pilmate Backend

## ✅ Issues Fixed

1. ✅ **TypeScript Error in supabase.config.ts** - Added fallback values for config.get()
2. ✅ **Updated .gitignore** - Added comprehensive ignore patterns for Prisma, IDE, OS files, etc.
3. ✅ **Build Errors** - All compilation errors resolved

---

## 📋 Essential Commands to Run

### 1️⃣ First Time Setup (Run These Now)

```bash
# Navigate to project directory
cd g:\pilmate\Pilmate_Backend\pilmate-backend

# Generate Prisma Client (creates type-safe database client)
npm run prisma:generate

# Create database tables (you need .env configured first!)
npm run prisma:migrate
# When prompted for migration name, type: init
```

**⚠️ IMPORTANT**: Before running `npm run prisma:migrate`, you MUST configure your `.env` file with actual Supabase credentials!

### 2️⃣ Daily Development

```bash
# Start development server with hot-reload
npm run start:dev

# View database in browser (GUI)
npm run prisma:studio

# After modifying prisma/schema.prisma:
npm run prisma:generate
npm run prisma:migrate
```

### 3️⃣ Before Committing to Git

```bash
# Format code
npm run format

# Check for linting errors
npm run lint

# Build to check for errors
npm run build
```

### 4️⃣ Production Deployment

```bash
# Build for production
npm run build

# Run production server
npm run start:prod

# Or use Docker
docker-compose up --build
```

---

## 📚 Complete Command Reference

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start server with auto-reload on file changes |
| `npm run start:debug` | Start server with debugger attached |
| `npm run start` | Start server without watch mode |

### Database Commands (Prisma)

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Generate Prisma Client (type-safe queries) |
| `npm run prisma:migrate` | Create and apply database migration |
| `npm run prisma:studio` | Open Prisma Studio (database GUI at localhost:5555) |
| `npm run prisma:deploy` | Deploy migrations to production |

### Code Quality Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run format` | Format code with Prettier |
| `npm run lint` | Check code with ESLint |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage report |

### Docker Commands

| Command | Description |
|---------|-------------|
| `docker-compose up --build` | Build and start containers |
| `docker-compose up -d` | Start containers in background |
| `docker-compose down` | Stop and remove containers |
| `docker-compose logs -f` | View container logs |

---

## 🎯 Your Next Steps (In Order)

### Step 1: Configure Environment (5 minutes)

1. Open `.env` file
2. Add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres.[project]:password@host:5432/postgres?schema=public
   JWT_SECRET=your-random-secret-string
   ```

### Step 2: Setup Database (2 minutes)

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate
```

### Step 3: Start Development Server (1 minute)

```bash
npm run start:dev
```

You should see:
```
🚀 Application is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/v1
```

### Step 4: Verify Everything Works

Open browser and visit:
- http://localhost:3000/api/v1

### Step 5: View Database (Optional)

```bash
npm run prisma:studio
```

Opens at: http://localhost:5555

---

## 🔧 Troubleshooting Commands

### If Build Fails

```bash
# Clean build
rm -rf dist
npm run build
```

Or in PowerShell:
```powershell
Remove-Item -Recurse -Force dist
npm run build
```

### If Prisma Has Issues

```bash
# Regenerate Prisma Client
npm run prisma:generate

# Reset database (WARNING: deletes all data!)
npx prisma migrate reset

# Force recreate migration
npx prisma migrate dev --force
```

### If Port 3000 is in Use

Option 1: Kill the process
```bash
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Option 2: Change port in `.env`
```env
PORT=3001
```

### If Node Modules Are Corrupted

```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

Or in PowerShell:
```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

---

## 📝 Git Commands

### Initial Git Setup

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Pilmate backend setup"

# Add remote repository
git remote add origin your-repo-url

# Push
git push -u origin main
```

### Daily Git Workflow

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Your message"

# Push
git push
```

---

## 🎓 Useful Tips

1. **Always run `npm run prisma:generate`** after modifying `prisma/schema.prisma`
2. **Use `npm run prisma:studio`** to visually inspect your database
3. **Run `npm run build`** before deploying to catch errors early
4. **Use `npm run start:dev`** during development for auto-reload
5. **Never commit `.env`** - it's in .gitignore for security
6. **Always filter by `storeId`** in queries for multi-tenant isolation

---

## 🆘 Quick Help

### "Command not found" errors
Make sure you're in the right directory:
```bash
cd g:\pilmate\Pilmate_Backend\pilmate-backend
```

### "Cannot find module" errors
Reinstall dependencies:
```bash
npm install
```

### "Database connection" errors
Check your `.env` file has correct DATABASE_URL

### "Port already in use" errors
Change PORT in `.env` or kill the process using it

---

## 📊 Project Status

✅ **All issues fixed!**
✅ **Build successful!**
✅ **.gitignore updated!**
✅ **Ready for development!**

**Next**: Configure `.env` and run `npm run prisma:migrate`

---

**Happy Coding! 🎉**
