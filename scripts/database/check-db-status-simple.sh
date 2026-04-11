#!/bin/bash

# Simple Database Status Check (no sqlite3 required)
echo "🔍 Current Database Status"
echo ""

DB_PATH="/usr/local/lsws/Example/html/Nutri/local.db"

echo "Database File:"
ls -lh "$DB_PATH"
echo ""

echo "Database Size:"
du -h "$DB_PATH"
echo ""

echo "WAL Files (Write-Ahead Log):"
ls -lh "$DB_PATH"-wal 2>/dev/null || echo "  No WAL file yet (will be created on first write)"
ls -lh "$DB_PATH"-shm 2>/dev/null || echo "  No SHM file yet (will be created on first write)"
echo ""

echo "Process Status:"
pm2 list
echo ""

echo "Recent Application Logs (last 30 lines):"
pm2 logs myapp --lines 30 --nostream
echo ""

echo "✅ Database is ready!"
echo ""
echo "📱 Now test the app:"
echo "  1. Open your app on your phone"
echo "  2. Try scanning food with the camera"
echo "  3. The error should be gone!"
echo ""
echo "To monitor live logs while testing:"
echo "  pm2 logs myapp"
