#!/bin/bash

# Test Database Write Script
# This script tests if the database is truly writable

echo "🧪 Testing SQLite database write access..."
echo ""

DB_PATH="/usr/local/lsws/Example/html/Nutri/local.db"

# Test 1: Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "⚠️  sqlite3 command not found, installing..."
    apt-get update && apt-get install -y sqlite3
fi

# Test 2: Try a simple write operation
echo "Test 1: Creating a test table and inserting data..."
sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS write_test (id INTEGER PRIMARY KEY, timestamp TEXT);" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Table creation successful"
else
    echo "❌ Table creation failed"
    exit 1
fi

# Test 3: Insert data
echo "Test 2: Inserting test data..."
sqlite3 "$DB_PATH" "INSERT INTO write_test (timestamp) VALUES (datetime('now'));" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Insert successful"
else
    echo "❌ Insert failed"
    exit 1
fi

# Test 4: Read data
echo "Test 3: Reading test data..."
RESULT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM write_test;")
echo "✅ Found $RESULT test record(s)"

# Test 5: Clean up
echo "Test 4: Cleaning up..."
sqlite3 "$DB_PATH" "DROP TABLE write_test;" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Cleanup successful"
else
    echo "⚠️  Cleanup warning (non-critical)"
fi

echo ""
echo "🎉 All database write tests passed!"
echo ""
echo "Current database status:"
ls -lh "$DB_PATH"
echo ""
echo "WAL files (if in WAL mode):"
ls -lh "$DB_PATH"-* 2>/dev/null || echo "  No WAL files yet (normal on first run)"
