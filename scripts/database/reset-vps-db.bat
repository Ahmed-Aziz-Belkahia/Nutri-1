@echo off
echo Connecting to VPS to reset database...
echo.

ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && git pull && rm -f local.db && pm2 restart myapp"

echo.
echo Done! The database has been deleted and recreated with new schema.
echo PM2 has been restarted.
