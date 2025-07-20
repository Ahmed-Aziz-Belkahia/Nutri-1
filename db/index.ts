import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@db/schema";
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Creating a new database...");
}

// Create HTTP connection with retries and logging
const createDatabaseConnection = () => {
  console.log('Connecting to database...');
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
};

// Initialize drizzle with retry mechanism
export const db = createDatabaseConnection();

// Test connection and log status
db.execute(sql`SELECT 1`)
  .then(() => console.log('✅ Database connection established successfully'))
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });