#!/bin/bash

# Quick fix script for meal plan table schema
echo "🔄 Fixing recipes_in_meal_plan table schema..."
echo ""

cd /usr/local/lsws/Example/html/Nutri

# Run the migration
node add-meal-plan-columns.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration successful!"
    echo ""
    echo "Restarting PM2..."
    pm2 restart myapp
    echo ""
    echo "🎉 Done! Try generating a meal plan now."
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    exit 1
fi
