#!/bin/bash
# Quick VPS Migration - Run this on your VPS

cd /usr/local/lsws/Example/html/Nutri && \
git pull origin main && \
node add-age-gender-migration.js && \
pm2 restart myapp && \
echo "✅ Migration complete! Check logs with: pm2 logs myapp"
