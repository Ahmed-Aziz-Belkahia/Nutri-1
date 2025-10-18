#!/bin/bash

echo "=========================================="
echo "Server Status Check"
echo "=========================================="
echo ""

echo "1. PM2 Status:"
pm2 status
echo ""

echo "2. Recent Server Logs (last 30 lines):"
pm2 logs myapp --lines 30 --nostream
echo ""

echo "3. Testing if server is responding:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5000/
echo ""

echo "4. Testing JWT auth endpoint:"
curl -s http://localhost:5000/api/auth/verify -H "Content-Type: application/json"
echo ""
echo ""

echo "5. Checking if port 5000 is listening:"
netstat -tlnp | grep :5000 || ss -tlnp | grep :5000
echo ""

echo "=========================================="
echo "If server is not responding:"
echo "  1. Check logs: pm2 logs myapp"
echo "  2. Restart: pm2 restart myapp"
echo "  3. Check errors: pm2 describe myapp"
echo "=========================================="
