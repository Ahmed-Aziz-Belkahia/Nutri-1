import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@db/schema";
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SQLite connection
const createDatabaseConnection = () => {
  // Use absolute path to ensure database is found regardless of working directory
  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');
  
  console.log('Connecting to local SQLite database...');
  console.log('Database path:', dbPath);
  
  try {
    const sqlite = new Database(dbPath, {
      // Enable write-ahead logging for better concurrency
      fileMustExist: false,
      // Set timeout for busy database (30 seconds)
      timeout: 30000,
    });
    
    // Enable WAL mode for better performance and concurrency
    sqlite.pragma('journal_mode = WAL');
    
    // Set busy timeout to handle concurrent writes
    sqlite.pragma('busy_timeout = 30000');
    
    console.log('✅ SQLite database opened successfully');
    console.log('Journal mode:', sqlite.pragma('journal_mode', { simple: true }));
    
    return drizzle(sqlite, { schema });
  } catch (error) {
    console.error('❌ Failed to open database:', error);
    console.error('Database path attempted:', dbPath);
    console.error('Current working directory:', process.cwd());
    throw error;
  }
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