import { db } from "./db/index.js";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    console.log("Running migration to add body fat columns...");
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join("migrations", "add_body_fat_columns.sql"), "utf8");
    
    // Execute the migration
    await db.execute(sqlContent);
    
    console.log("✅ Migration successful! Added body_fat_percentage and body_type columns");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();