# 🚀 Database Quick Fix

## Problem: Database errors after deletion or corruption

### Symptoms:
```
❌ SqliteError: no such table: refresh_tokens
❌ SqliteError: no such column: "description"
❌ Login/food logs not working
```

### ✅ Solution (Choose One):

**Option 1 - NPM Script (Easiest):**
```bash
npm run db:fix
```

**Option 2 - Direct:**
```bash
node recreate-database-complete.js
```

Both do the same thing!

That's it! This will:
- ✅ Backup your existing DB automatically
- ✅ Drop all tables
- ✅ Recreate ALL 20 tables with complete schema
- ✅ Create all 24 columns in food_logs
- ✅ Create JWT auth tables
- ✅ Create API tracking tables
- ✅ Add performance indexes
- ✅ Validate everything works

### After running, restart your server:
```bash
npm run dev
```

---

**That's the only command you need to remember!** 🎉

For more details, see DATABASE-GUIDE.md
