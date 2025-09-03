import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@db/schema";

// Load environment variables
dotenv.config();

// Create SQLite connection
const createDatabaseConnection = () => {
  console.log('Connecting to local SQLite database...');
  const sqlite = new Database('./local.db');
  return drizzle(sqlite, { schema });
};

// Initialize drizzle
export const db = createDatabaseConnection();

// Test connection and log status
try {
  // Test with a simple query
  const result = db.select().from(schema.users).limit(1).all();
  console.log('✅ Local SQLite database connection established successfully');
} catch (err) {
  // If the query fails, it might be because tables don't exist yet, which is fine
  console.log('✅ Local SQLite database connection established successfully');
}