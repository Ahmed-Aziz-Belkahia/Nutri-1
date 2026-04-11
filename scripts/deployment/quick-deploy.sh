#!/bin/bash
# Quick deploy - just pull and restart
git pull && npm install && npm run build && pm2 restart myapp && pm2 logs myapp --lines 20
