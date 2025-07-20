import { db } from "db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running migration: Creating weight_logs and progress_photos tables");

  // Create weight_logs table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      weight DECIMAL(5, 2) NOT NULL,
      note TEXT,
      logged_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Created weight_logs table");

  // Create progress_photos table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      photo_url TEXT NOT NULL,
      caption TEXT,
      type TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Created progress_photos table");

  console.log("Migration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration error:", error);
    process.exit(1);
  });